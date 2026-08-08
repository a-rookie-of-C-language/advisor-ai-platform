use crate::domain::core::quota_billing::TokenUsage::TokenUsage;
use crate::domain::core::quota_billing::UsageSummary::UsageSummary;

#[derive(sqlx::FromRow)]
pub(crate) struct TokenUsageRow {
    request_id: String,
    tenant_id: String,
    app_id: String,
    model: String,
    prompt_tokens: i64,
    completion_tokens: i64,
    total_tokens: i64,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<TokenUsageRow> for TokenUsage {
    fn from(r: TokenUsageRow) -> Self {
        TokenUsage {
            request_id: r.request_id,
            tenant_id: r.tenant_id,
            app_id: r.app_id,
            model: r.model,
            prompt_tokens: r.prompt_tokens,
            completion_tokens: r.completion_tokens,
            total_tokens: r.total_tokens,
            created_at: r.created_at,
        }
    }
}

#[derive(sqlx::FromRow)]
pub(crate) struct UsageSummaryRow {
    tenant_id: Option<String>,
    app_id: Option<String>,
    model: Option<String>,
    period_start: Option<chrono::DateTime<chrono::Utc>>,
    request_count: i64,
    total_prompt_tokens: i64,
    total_completion_tokens: i64,
    total_tokens: i64,
}

impl From<UsageSummaryRow> for UsageSummary {
    fn from(r: UsageSummaryRow) -> Self {
        UsageSummary {
            tenant_id: r.tenant_id,
            app_id: r.app_id,
            model: r.model,
            period_start: r.period_start,
            request_count: r.request_count,
            total_prompt_tokens: r.total_prompt_tokens,
            total_completion_tokens: r.total_completion_tokens,
            total_tokens: r.total_tokens,
        }
    }
}
