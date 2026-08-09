use async_trait::async_trait;
use sqlx::PgPool;

use crate::domain::core::quota_billing::TokenUsage::TokenUsage;
use crate::domain::core::quota_billing::TokenUsageDao::TokenUsageDao;
use crate::domain::core::quota_billing::UsageQuery::UsageQuery;
use crate::domain::core::quota_billing::UsageSummary::UsageSummary;
use crate::infrastructure::dao::billing::PostgresTokenUsageRows::{TokenUsageRow, UsageSummaryRow};
use crate::infrastructure::dao::billing::PostgresTokenUsageSql::{
    build_aggregate_sql, build_list_sql,
};

pub struct PostgresTokenUsageDao {
    pool: PgPool,
}

impl PostgresTokenUsageDao {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TokenUsageDao for PostgresTokenUsageDao {
    async fn insert(&self, usage: &TokenUsage) -> anyhow::Result<()> {
        sqlx::query(
            r#"INSERT INTO token_usage_records
               (request_id, tenant_id, app_id, model, prompt_tokens, completion_tokens, total_tokens, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (request_id) DO NOTHING"#,
        )
        .bind(&usage.request_id)
        .bind(&usage.tenant_id)
        .bind(&usage.app_id)
        .bind(&usage.model)
        .bind(usage.prompt_tokens)
        .bind(usage.completion_tokens)
        .bind(usage.total_tokens)
        .bind(usage.created_at)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn aggregate(&self, query: &UsageQuery) -> anyhow::Result<Vec<UsageSummary>> {
        let sql = build_aggregate_sql(query);
        let mut q = sqlx::query_as::<_, UsageSummaryRow>(&sql);
        if let Some(ref v) = query.tenant_id {
            q = q.bind(v);
        }
        if let Some(ref v) = query.app_id {
            q = q.bind(v);
        }
        if let Some(ref v) = query.model {
            q = q.bind(v);
        }
        if let Some(v) = query.from {
            q = q.bind(v);
        }
        if let Some(v) = query.to {
            q = q.bind(v);
        }
        if let Some(limit) = query.limit {
            q = q.bind(limit);
        }
        if let Some(offset) = query.offset {
            q = q.bind(offset);
        }

        let rows = q.fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn list(&self, query: &UsageQuery) -> anyhow::Result<Vec<TokenUsage>> {
        let sql = build_list_sql(query);
        let mut q = sqlx::query_as::<_, TokenUsageRow>(&sql);
        if let Some(ref v) = query.tenant_id {
            q = q.bind(v);
        }
        if let Some(ref v) = query.app_id {
            q = q.bind(v);
        }
        if let Some(ref v) = query.model {
            q = q.bind(v);
        }
        if let Some(v) = query.from {
            q = q.bind(v);
        }
        if let Some(v) = query.to {
            q = q.bind(v);
        }
        if let Some(limit) = query.limit {
            q = q.bind(limit);
        }
        if let Some(offset) = query.offset {
            q = q.bind(offset);
        }

        let rows = q.fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn purge_before(&self, before: chrono::DateTime<chrono::Utc>) -> anyhow::Result<u64> {
        let result = sqlx::query("DELETE FROM token_usage_records WHERE created_at < $1")
            .bind(before)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }
}
