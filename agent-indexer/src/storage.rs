use anyhow::{Context, Result};
use tokio_postgres::{Client, NoTls};

use crate::model::{Chunk, Document};

pub async fn connect(
    database_url: &str,
) -> Result<(
    Client,
    tokio_postgres::Connection<tokio_postgres::Socket, tokio_postgres::tls::NoTlsStream>,
)> {
    tokio_postgres::connect(database_url, NoTls)
        .await
        .context("failed to connect to PostgreSQL")
}

pub async fn pending_documents(client: &Client, limit: i64) -> Result<Vec<i64>> {
    let rows = client
        .query(
            "SELECT id FROM rag_document WHERE status IN ('PENDING', 'INDEXING') ORDER BY id LIMIT $1",
            &[&limit],
        )
        .await
        .context("failed to query pending documents")?;
    Ok(rows.into_iter().map(|row| row.get(0)).collect())
}

pub async fn document(client: &Client, document_id: i64) -> Result<Option<Document>> {
    let row = client
        .query_opt(
            "SELECT file_path, file_type FROM rag_document WHERE id = $1",
            &[&document_id],
        )
        .await
        .context("failed to load document")?;
    Ok(row.map(|row| Document {
        file_path: row.get(0),
        file_type: row.get(1),
    }))
}

pub async fn set_status(client: &Client, document_id: i64, status: &str) -> Result<()> {
    client
        .execute(
            "UPDATE rag_document SET status = $1, updated_at = NOW() WHERE id = $2",
            &[&status, &document_id],
        )
        .await
        .context("failed to update document status")?;
    Ok(())
}

pub async fn save_chunks(
    client: &mut Client,
    document_id: i64,
    chunks: &[Chunk],
    embeddings: &[Vec<f32>],
) -> Result<()> {
    if chunks.len() != embeddings.len() {
        return Err(anyhow::anyhow!("chunk and embedding counts do not match"));
    }

    let transaction = client
        .transaction()
        .await
        .context("failed to start chunk transaction")?;
    transaction
        .execute(
            "DELETE FROM rag_document_chunk WHERE document_id = $1",
            &[&document_id],
        )
        .await
        .context("failed to clear previous chunks")?;

    for (chunk, embedding) in chunks.iter().zip(embeddings) {
        let vector = format_vector(embedding);
        let metadata = chunk.metadata.to_string();
        transaction
            .execute(
                "INSERT INTO rag_document_chunk (document_id, chunk_index, content, embedding, metadata) VALUES ($1, $2, $3, CAST($4 AS TEXT)::vector, CAST($5 AS TEXT)::jsonb)",
                &[
                    &document_id,
                    &chunk.index,
                    &chunk.content,
                    &vector.as_str(),
                    &metadata.as_str(),
                ],
            )
            .await
            .map_err(|error| anyhow::anyhow!("failed to save document chunk: {error}"))?;
    }
    transaction
        .commit()
        .await
        .context("failed to commit document chunks")?;
    Ok(())
}

fn format_vector(values: &[f32]) -> String {
    let body = values
        .iter()
        .map(|value| value.to_string())
        .collect::<Vec<_>>()
        .join(",");
    format!("[{body}]")
}
