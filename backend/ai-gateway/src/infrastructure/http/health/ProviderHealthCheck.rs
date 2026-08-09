use std::sync::Arc;
use std::time::Duration;

use crate::application::chat::ChatService::ChatService;
use crate::domain::core::gateway_orchestration::CompletionRequest::CompletionRequest;
use crate::domain::core::gateway_orchestration::Message::Message;

pub async fn check_provider(chat_service: &Arc<dyn ChatService>) -> bool {
    let req = CompletionRequest {
        model: Some("health-check".to_string()),
        messages: vec![Message {
            role: "user".to_string(),
            content: "ping".to_string(),
        }],
        temperature: None,
        max_tokens: Some(1),
        top_p: None,
        frequency_penalty: None,
        presence_penalty: None,
        tools: None,
        response_format: None,
    };

    match tokio::time::timeout(Duration::from_secs(5), chat_service.complete(req)).await {
        Ok(Ok(_)) => true,
        Ok(Err(e)) => {
            tracing::warn!("provider health check failed: {}", e);
            false
        }
        Err(_) => {
            tracing::warn!("provider health check timed out");
            false
        }
    }
}
