use std::sync::Arc;

use anyhow::Result;

use crate::config::Config;
use crate::domain::core::quota_billing::QuotaPolicyDao::QuotaPolicyDao;
use crate::domain::core::quota_billing::TokenUsageDao::TokenUsageDao;
use crate::domain::core::tenant_access_control::TenantDao::TenantDao;
use crate::domain::supporting::observability_audit::AuditLogDao::AuditLogDao;
use crate::domain::supporting::traffic_governance::RateLimitDao::RateLimitDao;
use crate::infrastructure::dao::audit::PostgresAuditLogDao::PostgresAuditLogDao;
use crate::infrastructure::dao::billing::PostgresTokenUsageDao::PostgresTokenUsageDao;
use crate::infrastructure::dao::quota::RedisQuotaPolicyDao::RedisQuotaPolicyDao;
use crate::infrastructure::dao::ratelimit::RedisRateLimitDao::RedisRateLimitDao;
use crate::infrastructure::dao::tenant::PostgresTenantDao::PostgresTenantDao;

pub struct DataAccessAssembly {
    pub redis_client: redis::Client,
    pub rate_limit_dao: Arc<dyn RateLimitDao>,
    pub quota_policy_dao: Arc<dyn QuotaPolicyDao>,
    pub token_usage_dao: Option<Arc<dyn TokenUsageDao>>,
    pub pg_pool: Option<sqlx::PgPool>,
    pub tenant_dao: Option<Arc<dyn TenantDao>>,
    pub audit_log_dao: Option<Arc<dyn AuditLogDao>>,
}

pub async fn build_data_access(cfg: &Config) -> Result<DataAccessAssembly> {
    let redis_client = redis::Client::open(cfg.redis_addr.clone())?;
    let rate_limit_dao: Arc<dyn RateLimitDao> =
        Arc::new(RedisRateLimitDao::new(redis_client.clone()));
    let quota_policy_dao: Arc<dyn QuotaPolicyDao> =
        Arc::new(RedisQuotaPolicyDao::new(redis_client.clone()));

    let postgres = build_postgres_data_access(cfg).await?;

    Ok(DataAccessAssembly {
        redis_client,
        rate_limit_dao,
        quota_policy_dao,
        token_usage_dao: postgres.token_usage_dao,
        pg_pool: postgres.pg_pool,
        tenant_dao: postgres.tenant_dao,
        audit_log_dao: postgres.audit_log_dao,
    })
}

struct PostgresDataAccess {
    token_usage_dao: Option<Arc<dyn TokenUsageDao>>,
    pg_pool: Option<sqlx::PgPool>,
    tenant_dao: Option<Arc<dyn TenantDao>>,
    audit_log_dao: Option<Arc<dyn AuditLogDao>>,
}

async fn build_postgres_data_access(cfg: &Config) -> Result<PostgresDataAccess> {
    let Some(url) = &cfg.database_url else {
        tracing::info!(
            "DATABASE_URL not set, token usage persistence, tenant management, and audit logs disabled"
        );
        return Ok(PostgresDataAccess {
            token_usage_dao: None,
            pg_pool: None,
            tenant_dao: None,
            audit_log_dao: None,
        });
    };

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(cfg.db_max_connections)
        .connect(url)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("PostgreSQL connected, migrations applied");

    let pool_clone = pool.clone();
    let tenant_dao: Arc<dyn TenantDao> = Arc::new(PostgresTenantDao::new(pool.clone()));
    let audit_log_dao: Arc<dyn AuditLogDao> = Arc::new(PostgresAuditLogDao::new(pool.clone()));

    Ok(PostgresDataAccess {
        token_usage_dao: Some(Arc::new(PostgresTokenUsageDao::new(pool)) as Arc<dyn TokenUsageDao>),
        pg_pool: Some(pool_clone),
        tenant_dao: Some(tenant_dao),
        audit_log_dao: Some(audit_log_dao),
    })
}
