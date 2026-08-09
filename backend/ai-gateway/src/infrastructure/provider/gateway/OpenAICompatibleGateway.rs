use async_trait::async_trait;
use reqwest::Client;
use std::time::Duration;

use crate::domain::core::gateway_orchestration::ChatGateway::ChatGateway;
use crate::domain::core::gateway_orchestration::CompletionRequest::CompletionRequest;
use crate::domain::core::gateway_orchestration::CompletionResult::CompletionResult;
use crate::domain::core::quota_billing::StreamingCompletion::StreamingCompletion;
use crate::infrastructure::provider::OpenAIChatCompletionRequest::{
    resolve_chat_model, send_chat_completion_request,
};
use crate::infrastructure::provider::OpenAICompletionResponseParser::parse_completion_result;
use crate::infrastructure::provider::OpenAIRequestBody::build_chat_completion_body;
use crate::infrastructure::provider::OpenAIStreamResponseReader::build_streaming_completion;

pub struct OpenAICompatibleGateway {
    pub client: Client,
    pub base_url: String,
    pub api_key: String,
    pub default_model: String,
}

impl OpenAICompatibleGateway {
    pub fn new(
        base_url: String,
        api_key: String,
        default_model: String,
        timeout_sec: u64,
    ) -> anyhow::Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(timeout_sec))
            .build()?;
        Ok(Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key,
            default_model,
        })
    }
}

#[async_trait]
impl ChatGateway for OpenAICompatibleGateway {
    async fn complete(&self, req: CompletionRequest) -> anyhow::Result<CompletionResult> {
        let model = resolve_chat_model(&req, &self.default_model);
        let body = build_chat_completion_body(&req, &model, false);
        let response =
            send_chat_completion_request(&self.client, &self.base_url, &self.api_key, &body)
                .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("provider call failed: status={}, body={}", status, body);
        }

        Ok(parse_completion_result(
            response.json().await?,
            &self.default_model,
        ))
    }

    async fn stream_complete(&self, req: CompletionRequest) -> anyhow::Result<StreamingCompletion> {
        let model = resolve_chat_model(&req, &self.default_model);
        let body = build_chat_completion_body(&req, &model, true);
        let response =
            send_chat_completion_request(&self.client, &self.base_url, &self.api_key, &body)
                .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("provider stream failed: status={}, body={}", status, body);
        }

        Ok(build_streaming_completion(response))
    }
}
