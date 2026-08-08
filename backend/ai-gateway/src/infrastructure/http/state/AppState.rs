use std::sync::Arc;

use crate::application::chat::ChatService::ChatService;
use crate::domain::core::quota_billing::QuotaPolicy::QuotaPolicy;
use crate::domain::core::quota_billing::QuotaPolicyDao::QuotaPolicyDao;
use crate::domain::core::quota_billing::TokenUsageDao::TokenUsageDao;
use crate::domain::supporting::observability_audit::AuditLogDao::AuditLogDao;
use crate::infrastructure::http::ProviderHealthCheck;
use crate::infrastructure::http::QuotaCounter;

#[derive(Clone)]
pub struct AppState {
    pub chat_service: Arc<dyn ChatService>,
    pub default_quota_policy: QuotaPolicy,
    pub quota_policy_dao: Option<Arc<dyn QuotaPolicyDao>>,
    pub redis_client: redis::Client,
    pub token_usage_dao: Option<Arc<dyn TokenUsageDao>>,
    pub audit_log_dao: Option<Arc<dyn AuditLogDao>>,
    pub pg_pool: Option<sqlx::PgPool>,
}

impl AppState {
    pub async fn get_quota_policy(&self, tenant_id: &str, app_id: &str) -> QuotaPolicy {
        if let Some(ref dao) = self.quota_policy_dao {
            match dao.get_policy(tenant_id, app_id).await {
                Ok(Some(policy)) => return policy,
                Ok(None) => {}
                Err(e) => {
                    tracing::warn!("failed to get tenant quota policy: {}, using default", e);
                }
            }
        }
        self.default_quota_policy.clone()
    }

    pub async fn try_consume_tokens(
        &self,
        tokens: u64,
        tenant_id: &str,
        app_id: &str,
    ) -> anyhow::Result<bool> {
        let policy = self.get_quota_policy(tenant_id, app_id).await;
        QuotaCounter::try_consume_tokens(&self.redis_client, &policy, tokens, tenant_id, app_id)
            .await
    }

    pub async fn release_tokens(
        &self,
        tokens: u64,
        tenant_id: &str,
        app_id: &str,
    ) -> anyhow::Result<()> {
        QuotaCounter::release_tokens(&self.redis_client, tokens, tenant_id, app_id).await
    }

    pub async fn check_redis(&self) -> bool {
        match self.redis_client.get_multiplexed_async_connection().await {
            Ok(mut conn) => {
                let _: Result<String, _> = redis::cmd("PING").query_async(&mut conn).await;
                true
            }
            Err(_) => false,
        }
    }

    pub async fn check_postgres(&self) -> Option<bool> {
        match &self.pg_pool {
            Some(pool) => Some(sqlx::query("SELECT 1").execute(pool).await.is_ok()),
            None => None,
        }
    }

    pub async fn check_provider(&self) -> bool {
        ProviderHealthCheck::check_provider(&self.chat_service).await
    }
}
