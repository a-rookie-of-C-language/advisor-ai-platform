use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub ollama_base_url: String,
    pub embedding_model: String,
    pub batch_size: i64,
    pub chunk_size: usize,
    pub chunk_overlap: usize,
    pub embedding_batch_size: usize,
    pub retry_backoff_seconds: u64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            ollama_base_url: env::var("OLLAMA_BASE_URL")
                .unwrap_or_else(|_| "http://host.docker.internal:11434".to_owned()),
            embedding_model: env::var("EMBEDDING_MODEL").unwrap_or_else(|_| "bge-m3".to_owned()),
            batch_size: parse_env("INDEXER_BATCH_SIZE", 10)?,
            chunk_size: parse_env("INDEXER_CHUNK_SIZE", 800)?,
            chunk_overlap: parse_env("INDEXER_CHUNK_OVERLAP", 120)?,
            embedding_batch_size: parse_env("INDEXER_EMBEDDING_BATCH_SIZE", 16)?,
            retry_backoff_seconds: parse_env("INDEXER_RETRY_BACKOFF_SEC", 5)?,
        })
    }
}

fn required(name: &str) -> anyhow::Result<String> {
    env::var(name).map_err(|_| anyhow::anyhow!("missing required environment variable: {name}"))
}

fn parse_env<T>(name: &str, default: T) -> anyhow::Result<T>
where
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    match env::var(name) {
        Ok(value) => value
            .parse()
            .map_err(|error| anyhow::anyhow!("invalid {name}: {error}")),
        Err(_) => Ok(default),
    }
}
