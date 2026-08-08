use axum::{
    extract::{Extension, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde_json::json;
use std::time::Instant;

use crate::domain::core::gateway_orchestration::CompletionRequest::CompletionRequest;
use crate::domain::core::tenant_access_control::TenantIdentity::TenantIdentity;
use crate::domain::supporting::observability_audit::TraceRecord::TraceRecord;
use crate::infrastructure::http::AppState::AppState;
use crate::interfaces::http::chat_audit::persist_chat_audit;
use crate::interfaces::http::chat_completion_usage::settle_completion_usage;
use crate::shared::json_extractor::UnifiedJson;
use crate::shared::response;
use crate::shared::token_estimator::estimate_request_tokens;
use crate::shared::validator::validate_request;

pub async fn chat_completions(
    State(state): State<AppState>,
    Extension(tenant): Extension<TenantIdentity>,
    headers: HeaderMap,
    UnifiedJson(payload): UnifiedJson<CompletionRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let started_at = Instant::now();
    validate_request(&payload)?;

    let request_id = headers
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("-")
        .to_string();

    let trace = TraceRecord {
        request_id,
        provider: "openai-compatible".to_string(),
        span_id: None,
    };

    let estimated_tokens = estimate_request_tokens(&payload);

    match state
        .try_consume_tokens(estimated_tokens, &tenant.tenant_id, &tenant.app_id)
        .await
    {
        Ok(true) => {}
        Ok(false) => {
            persist_chat_audit(
                &state,
                &tenant,
                &trace,
                "POST",
                "/v1/chat/completions",
                StatusCode::PAYMENT_REQUIRED,
                started_at.elapsed(),
                Some("quota exceeded".to_string()),
            )
            .await;
            return Err(response::err(
                StatusCode::PAYMENT_REQUIRED,
                "quota exceeded",
            ));
        }
        Err(e) => {
            tracing::error!("quota check failed: {}", e);
            persist_chat_audit(
                &state,
                &tenant,
                &trace,
                "POST",
                "/v1/chat/completions",
                StatusCode::INTERNAL_SERVER_ERROR,
                started_at.elapsed(),
                Some("quota service unavailable".to_string()),
            )
            .await;
            return Err(response::err(
                StatusCode::INTERNAL_SERVER_ERROR,
                "quota service unavailable",
            ));
        }
    }

    tracing::info!(
        tenant_id = %tenant.tenant_id,
        app_id = %tenant.app_id,
        request_id = %trace.request_id,
        provider = %trace.provider,
        estimated_tokens = estimated_tokens,
        "chat completion request"
    );

    match state.chat_service.complete(payload).await {
        Ok(data) => {
            settle_completion_usage(&state, &tenant, &trace, &data, estimated_tokens).await;
            persist_chat_audit(
                &state,
                &tenant,
                &trace,
                "POST",
                "/v1/chat/completions",
                StatusCode::OK,
                started_at.elapsed(),
                None,
            )
            .await;
            Ok(response::ok(json!(data)))
        }
        Err(err) => {
            tracing::error!(request_id = %trace.request_id, "provider error: {:?}", err);
            if let Err(e) = state
                .release_tokens(estimated_tokens, &tenant.tenant_id, &tenant.app_id)
                .await
            {
                tracing::error!(request_id = %trace.request_id, "quota rollback on provider error failed: {}", e);
            }
            persist_chat_audit(
                &state,
                &tenant,
                &trace,
                "POST",
                "/v1/chat/completions",
                StatusCode::BAD_GATEWAY,
                started_at.elapsed(),
                Some("upstream service error".to_string()),
            )
            .await;
            Err(response::err(
                StatusCode::BAD_GATEWAY,
                "upstream service error",
            ))
        }
    }
}
