use redis::AsyncCommands;

use crate::domain::core::quota_billing::QuotaPolicy::QuotaPolicy;

const QUOTA_KEY_TTL_SECONDS: u64 = 86_400;

pub async fn try_consume_tokens(
    redis_client: &redis::Client,
    policy: &QuotaPolicy,
    tokens: u64,
    tenant_id: &str,
    app_id: &str,
) -> anyhow::Result<bool> {
    let key = quota_key(tenant_id, app_id);
    let max = policy.max_tokens_per_day;
    let mut conn = redis_client.get_multiplexed_async_connection().await?;

    let script = redis::Script::new(
        r"
        local current = redis.call('INCRBY', KEYS[1], ARGV[1])
        if redis.call('TTL', KEYS[1]) == -1 then
            redis.call('EXPIRE', KEYS[1], ARGV[2])
        end
        if current > tonumber(ARGV[3]) then
            redis.call('DECRBY', KEYS[1], ARGV[1])
            return 0
        end
        return 1
    ",
    );

    let result: i32 = script
        .key(&key)
        .arg(tokens)
        .arg(QUOTA_KEY_TTL_SECONDS)
        .arg(max)
        .invoke_async(&mut conn)
        .await?;

    Ok(result == 1)
}

pub async fn release_tokens(
    redis_client: &redis::Client,
    tokens: u64,
    tenant_id: &str,
    app_id: &str,
) -> anyhow::Result<()> {
    let key = quota_key(tenant_id, app_id);
    let mut conn = redis_client.get_multiplexed_async_connection().await?;
    let _: i64 = conn.decr(&key, tokens).await?;
    Ok(())
}

fn quota_key(tenant_id: &str, app_id: &str) -> String {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    format!("quota:{}:{}:{}", tenant_id, app_id, today)
}
