use anyhow::Result;
use futures_util::future::poll_fn;
use tokio::time::{interval, Duration, MissedTickBehavior};
use tokio_postgres::AsyncMessage;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::{chunker, embedding::EmbeddingClient, model::Document, storage};

pub async fn run(config: Config) -> Result<()> {
    let embedding = EmbeddingClient::new(
        config.ollama_base_url.clone(),
        config.embedding_model.clone(),
    );
    loop {
        match run_connection(&config, &embedding).await {
            Ok(()) => warn!("PostgreSQL listener stopped; reconnecting"),
            Err(error) => error!(%error, "indexer connection failed; reconnecting"),
        }
        tokio::time::sleep(Duration::from_secs(config.retry_backoff_seconds)).await;
    }
}

async fn run_connection(config: &Config, embedding: &EmbeddingClient) -> Result<()> {
    info!("connecting to PostgreSQL");
    let (mut client, connection) = storage::connect(&config.database_url).await?;
    info!("connected to PostgreSQL");
    let (notification_sender, mut notification_receiver) = tokio::sync::mpsc::channel(32);
    tokio::spawn(async move {
        let mut connection = connection;
        loop {
            let message = poll_fn(|context| connection.poll_message(context)).await;
            match message {
                Some(Ok(AsyncMessage::Notification(notification))) => {
                    if notification_sender
                        .send(notification.payload().to_owned())
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Some(Ok(_)) => {}
                Some(Err(error)) => {
                    warn!(%error, "PostgreSQL connection driver stopped");
                    break;
                }
                None => break,
            }
        }
    });
    client.batch_execute("LISTEN rag_index").await?;
    info!("agent-indexer listening on PostgreSQL channel rag_index");

    process_pending(&mut client, config, embedding).await;
    let mut tick = interval(Duration::from_secs(10));
    tick.set_missed_tick_behavior(MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            payload = notification_receiver.recv() => {
                match payload {
                    Some(payload) => match payload.parse::<i64>() {
                        Ok(document_id) => process_one(&mut client, document_id, config, embedding).await,
                        Err(error) => warn!(%payload, %error, "invalid rag_index notification"),
                    },
                    None => return Ok(()),
                }
            }
            _ = tick.tick() => process_pending(&mut client, config, embedding).await,
        }
    }
}

async fn process_pending(
    client: &mut tokio_postgres::Client,
    config: &Config,
    embedding: &EmbeddingClient,
) {
    info!("scanning pending documents");
    match storage::pending_documents(client, config.batch_size).await {
        Ok(document_ids) => {
            info!(
                count = document_ids.len(),
                "pending document scan completed"
            );
            for document_id in document_ids {
                process_one(client, document_id, config, embedding).await;
            }
        }
        Err(error) => error!(%error, "failed to scan pending documents"),
    }
}

async fn process_one(
    client: &mut tokio_postgres::Client,
    document_id: i64,
    config: &Config,
    embedding: &EmbeddingClient,
) {
    let result = process_document(client, document_id, config, embedding).await;
    if let Err(error) = result {
        error!(document_id, error = ?error, "document indexing failed");
        if let Err(status_error) = storage::set_status(client, document_id, "FAILED").await {
            error!(document_id, %status_error, "failed to mark document as FAILED");
        }
    }
}

async fn process_document(
    client: &mut tokio_postgres::Client,
    document_id: i64,
    config: &Config,
    embedding: &EmbeddingClient,
) -> Result<()> {
    let document = match storage::document(client, document_id).await? {
        Some(document) => document,
        None => return Ok(()),
    };
    storage::set_status(client, document_id, "INDEXING").await?;
    let chunks = chunk_document(&document, config).await?;
    let mut embeddings = Vec::with_capacity(chunks.len());
    for (batch_index, batch) in chunks.chunks(config.embedding_batch_size).enumerate() {
        let texts = batch
            .iter()
            .map(|chunk| chunk.content.clone())
            .collect::<Vec<_>>();
        let batch_embeddings = embedding.embed(&texts).await?;
        embeddings.extend(batch_embeddings);
        info!(
            document_id,
            batch = batch_index + 1,
            "document embedding batch completed"
        );
    }
    storage::save_chunks(client, document_id, &chunks, &embeddings).await?;
    storage::set_status(client, document_id, "READY").await?;
    info!(
        document_id,
        chunks = chunks.len(),
        "document indexing completed"
    );
    Ok(())
}

async fn chunk_document(document: &Document, config: &Config) -> Result<Vec<crate::model::Chunk>> {
    chunker::chunk_document(
        std::path::Path::new(&document.file_path),
        &document.file_type,
        config.chunk_size,
        config.chunk_overlap,
    )
    .await
}
