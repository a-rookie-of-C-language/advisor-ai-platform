use std::sync::Arc;
use std::time::Duration;

use tokio::sync::oneshot;

use crate::domain::core::quota_billing::TokenUsage::TokenUsage;
use crate::domain::core::quota_billing::TokenUsageDao::TokenUsageDao;
use crate::domain::core::tenant_access_control::TenantIdentity::TenantIdentity;
use crate::infrastructure::http::AppState::AppState;

const MAX_ROLLBACK_RETRIES: u32 = 3;

pub async fn retry_release_tokens(
    state: &AppState,
    tokens: u64,
    tenant_id: &str,
    app_id: &str,
    request_id: &str,
) {
    for attempt in 0..MAX_ROLLBACK_RETRIES {
        match state.release_tokens(tokens, tenant_id, app_id).await {
            Ok(_) => return,
            Err(e) => {
                tracing::warn!(
                    request_id = %request_id,
                    attempt,
                    error = %e,
                    "quota rollback failed, retrying"
                );
                if attempt < MAX_ROLLBACK_RETRIES - 1 {
                    tokio::time::sleep(Duration::from_millis(100 * 2u64.pow(attempt))).await;
                }
            }
        }
    }
    tracing::error!(request_id = %request_id, "quota rollback failed after all retries");
}

pub fn spawn_stream_usage_settlement(
    state: AppState,
    usage_rx: oneshot::Receiver<Option<TokenUsage>>,
    estimated_tokens: u64,
    tenant: &TenantIdentity,
    request_id: &str,
) {
    let dao = state.token_usage_dao.clone();
    let tenant_id = tenant.tenant_id.clone();
    let app_id = tenant.app_id.clone();
    let req_id = request_id.to_string();

    tokio::spawn(async move {
        let result = tokio::time::timeout(Duration::from_secs(10), async {
            match usage_rx.await {
                Ok(Some(mut usage)) => {
                    settle_stream_usage(
                        &state,
                        &dao,
                        &mut usage,
                        estimated_tokens,
                        &tenant_id,
                        &app_id,
                        &req_id,
                    )
                    .await;
                }
                Ok(None) => {}
                Err(_) => {
                    tracing::error!("usage oneshot channel dropped");
                }
            }
        })
        .await;

        if result.is_err() {
            tracing::warn!(request_id = %req_id, "streaming usage persistence timed out");
        }
    });
}

async fn settle_stream_usage(
    state: &AppState,
    dao: &Option<Arc<dyn TokenUsageDao>>,
    usage: &mut TokenUsage,
    estimated_tokens: u64,
    tenant_id: &str,
    app_id: &str,
    request_id: &str,
) {
    fill_usage_identity(usage, tenant_id, app_id, request_id);
    adjust_stream_quota(
        state,
        usage.total_tokens as u64,
        estimated_tokens,
        tenant_id,
        app_id,
        request_id,
    )
    .await;

    if let Some(ref dao) = dao {
        if let Err(e) = dao.insert(usage).await {
            tracing::error!("failed to persist streaming token usage: {}", e);
            retry_release_tokens(state, estimated_tokens, tenant_id, app_id, request_id).await;
        }
    }
}

fn fill_usage_identity(usage: &mut TokenUsage, tenant_id: &str, app_id: &str, request_id: &str) {
    if usage.request_id.is_empty() {
        usage.request_id = request_id.to_string();
    }
    if usage.tenant_id.is_empty() {
        usage.tenant_id = tenant_id.to_string();
    }
    if usage.app_id.is_empty() {
        usage.app_id = app_id.to_string();
    }
}

async fn adjust_stream_quota(
    state: &AppState,
    actual_tokens: u64,
    estimated_tokens: u64,
    tenant_id: &str,
    app_id: &str,
    request_id: &str,
) {
    if actual_tokens > estimated_tokens {
        if let Err(e) = state
            .try_consume_tokens(actual_tokens - estimated_tokens, tenant_id, app_id)
            .await
        {
            tracing::warn!(request_id = %request_id, "streaming quota top-up failed: {}", e);
        }
    } else if actual_tokens < estimated_tokens {
        retry_release_tokens(
            state,
            estimated_tokens - actual_tokens,
            tenant_id,
            app_id,
            request_id,
        )
        .await;
    }
}
