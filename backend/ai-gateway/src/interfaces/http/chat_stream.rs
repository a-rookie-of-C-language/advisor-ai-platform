use std::convert::Infallible;
use std::time::Instant;

use axum::{
    extract::{Extension, State},
    http::{HeaderMap, StatusCode},
    response::sse::{Event, Sse},
    Json,
};
use futures_util::{stream, StreamExt};

use crate::domain::core::gateway_orchestration::CompletionRequest::CompletionRequest;
use crate::domain::core::tenant_access_control::TenantIdentity::TenantIdentity;
use crate::domain::supporting::observability_audit::TraceRecord::TraceRecord;
use crate::infrastructure::http::AppState::AppState;
use crate::interfaces::http::chat_audit::persist_chat_audit;
use crate::interfaces::http::chat_stream_usage::{
    retry_release_tokens, spawn_stream_usage_settlement,
};
use crate::shared::json_extractor::UnifiedJson;
use crate::shared::response;
use crate::shared::token_estimator::estimate_request_tokens;
use crate::shared::validator::validate_request;

pub async fn chat_stream(
    State(state): State<AppState>,
    Extension(tenant): Extension<TenantIdentity>,
    headers: HeaderMap,
    UnifiedJson(payload): UnifiedJson<CompletionRequest>,
) -> Result<
    Sse<futures_util::stream::BoxStream<'static, Result<Event, Infallible>>>,
    (StatusCode, Json<serde_json::Value>),
> {
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
                "/v1/chat/stream",
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
                "/v1/chat/stream",
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
        "chat stream request"
    );

    let streaming = match state.chat_service.stream_complete(payload).await {
        Ok(s) => s,
        Err(err) => {
            tracing::error!(request_id = %trace.request_id, "provider stream error: {:?}", err);
            retry_release_tokens(
                &state,
                estimated_tokens,
                &tenant.tenant_id,
                &tenant.app_id,
                &trace.request_id,
            )
            .await;
            persist_chat_audit(
                &state,
                &tenant,
                &trace,
                "POST",
                "/v1/chat/stream",
                StatusCode::OK,
                started_at.elapsed(),
                Some("upstream service error".to_string()),
            )
            .await;
            let evs = stream::iter(vec![
                Ok(Event::default()
                    .event("error")
                    .data(serde_json::json!({"message": "upstream service error"}).to_string())),
                Ok(Event::default()
                    .event("done")
                    .data("{\"finish_reason\":\"error\"}")),
            ]);
            return Ok(Sse::new(Box::pin(evs)));
        }
    };

    let upstream = streaming.stream;
    let usage_rx = streaming.usage_rx;
    spawn_stream_usage_settlement(
        state.clone(),
        usage_rx,
        estimated_tokens,
        &tenant,
        &trace.request_id,
    );
    persist_chat_audit(
        &state,
        &tenant,
        &trace,
        "POST",
        "/v1/chat/stream",
        StatusCode::OK,
        started_at.elapsed(),
        None,
    )
    .await;

    let trace_id = trace.request_id.clone();
    let out = upstream.map(move |item| -> Result<Event, Infallible> {
        match item {
            Ok(node) => {
                tracing::debug!(request_id = %trace_id, raw = %node, "provider raw event");
                Ok(Event::default().event("raw").data(node.to_string()))
            }
            Err(err) => Ok(Event::default()
                .event("error")
                .data(serde_json::json!({"message": err.to_string()}).to_string())),
        }
    });
    let done = stream::iter(vec![Ok(Event::default()
        .event("done")
        .data("{\"finish_reason\":\"stop\"}"))]);
    let merged: futures_util::stream::BoxStream<'static, Result<Event, Infallible>> =
        Box::pin(out.chain(done));

    Ok(Sse::new(merged))
}
