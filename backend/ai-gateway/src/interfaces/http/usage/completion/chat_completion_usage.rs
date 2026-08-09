use crate::domain::core::gateway_orchestration::CompletionResult::CompletionResult;
use crate::domain::core::quota_billing::TokenUsage::TokenUsage;
use crate::domain::core::tenant_access_control::TenantIdentity::TenantIdentity;
use crate::domain::supporting::observability_audit::TraceRecord::TraceRecord;
use crate::infrastructure::http::AppState::AppState;

pub async fn settle_completion_usage(
    state: &AppState,
    tenant: &TenantIdentity,
    trace: &TraceRecord,
    data: &CompletionResult,
    estimated_tokens: u64,
) {
    adjust_completion_quota(state, tenant, trace, data, estimated_tokens).await;
    persist_completion_usage(state, tenant, trace, data, estimated_tokens).await;
}

async fn adjust_completion_quota(
    state: &AppState,
    tenant: &TenantIdentity,
    trace: &TraceRecord,
    data: &CompletionResult,
    estimated_tokens: u64,
) {
    if let Some(tt) = data.total_tokens {
        let actual = tt as u64;
        if actual > estimated_tokens {
            if let Err(e) = state
                .try_consume_tokens(actual - estimated_tokens, &tenant.tenant_id, &tenant.app_id)
                .await
            {
                tracing::warn!(request_id = %trace.request_id, "quota top-up failed: {}", e);
            }
        } else if actual < estimated_tokens {
            if let Err(e) = state
                .release_tokens(estimated_tokens - actual, &tenant.tenant_id, &tenant.app_id)
                .await
            {
                tracing::warn!(request_id = %trace.request_id, "quota rollback failed: {}", e);
            }
        }
    }
}

async fn persist_completion_usage(
    state: &AppState,
    tenant: &TenantIdentity,
    trace: &TraceRecord,
    data: &CompletionResult,
    estimated_tokens: u64,
) {
    if let (Some(pt), Some(ct), Some(tt)) = (
        data.prompt_tokens,
        data.completion_tokens,
        data.total_tokens,
    ) {
        if let Some(ref dao) = state.token_usage_dao {
            let usage = TokenUsage {
                request_id: trace.request_id.clone(),
                tenant_id: tenant.tenant_id.clone(),
                app_id: tenant.app_id.clone(),
                model: data.model.clone(),
                prompt_tokens: pt,
                completion_tokens: ct,
                total_tokens: tt,
                created_at: chrono::Utc::now(),
            };
            if let Err(e) = dao.insert(&usage).await {
                tracing::error!(request_id = %trace.request_id, "failed to persist token usage: {}", e);
                if let Err(rollback_err) = state
                    .release_tokens(estimated_tokens, &tenant.tenant_id, &tenant.app_id)
                    .await
                {
                    tracing::error!(request_id = %trace.request_id, "quota rollback failed: {}", rollback_err);
                }
            }
        }
    }
}
