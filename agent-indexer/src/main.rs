mod chunker;
mod config;
mod embedding;
mod indexer;
mod model;
mod storage;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    let config = config::Config::from_env()?;
    tracing::info!("agent-indexer starting");
    tokio::select! {
        result = indexer::run(config) => result,
        _ = tokio::signal::ctrl_c() => Ok(()),
    }
}
