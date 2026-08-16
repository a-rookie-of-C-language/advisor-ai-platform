use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

#[derive(Clone)]
pub struct EmbeddingClient {
    client: Client,
    base_url: String,
    model: String,
}

#[derive(Deserialize)]
struct EmbedResponse {
    embeddings: Vec<Vec<f32>>,
}

impl EmbeddingClient {
    pub fn new(base_url: String, model: String) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(120))
                .build()
                .expect("failed to build HTTP client"),
            base_url: base_url.trim_end_matches('/').to_owned(),
            model,
        }
    }

    pub async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let response = self
            .client
            .post(format!("{}/api/embed", self.base_url))
            .json(&serde_json::json!({ "model": self.model, "input": texts }))
            .send()
            .await
            .context("failed to call Ollama embedding API")?
            .error_for_status()
            .context("Ollama embedding API returned an error")?
            .json::<EmbedResponse>()
            .await
            .context("invalid Ollama embedding response")?;

        if response.embeddings.len() != texts.len() {
            return Err(anyhow::anyhow!(
                "embedding count mismatch: expected {}, got {}",
                texts.len(),
                response.embeddings.len()
            ));
        }
        Ok(response.embeddings)
    }
}
