use reqwest::{Client, Response};
use serde_json::Value;

use crate::domain::core::gateway_orchestration::CompletionRequest::CompletionRequest;

pub fn resolve_chat_model(req: &CompletionRequest, default_model: &str) -> String {
    req.model
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| default_model.to_string())
}

pub async fn send_chat_completion_request(
    client: &Client,
    base_url: &str,
    api_key: &str,
    body: &Value,
) -> anyhow::Result<Response> {
    Ok(client
        .post(format!("{}/chat/completions", base_url))
        .bearer_auth(api_key)
        .json(body)
        .send()
        .await?)
}
