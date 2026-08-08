use anyhow::Result;
use axum::middleware;

use crate::bootstrap::App::App;
use crate::bootstrap::DataAccessAssembly::build_data_access;
use crate::bootstrap::ProviderAssembly::build_chat_service;
use crate::config::Config;
use crate::domain::core::quota_billing::QuotaPolicy::QuotaPolicy;
use crate::infrastructure::http::build_router::build_router;
use crate::infrastructure::http::AppState::AppState;
use crate::interfaces::http::middleware::MiddlewareState::MiddlewareState;

pub async fn build_app() -> Result<App> {
    let cfg = Config::load().map_err(|e| {
        tracing::error!("{}", e);
        e
    })?;

    let chat_service = build_chat_service(&cfg)?;
    let data_access = build_data_access(&cfg).await?;

    let app_state = AppState {
        chat_service,
        default_quota_policy: QuotaPolicy {
            plan_code: "default".to_string(),
            max_tokens_per_day: cfg.max_tokens_per_day,
            max_tokens_per_request: None,
            rate_limit_per_min: None,
        },
        quota_policy_dao: Some(data_access.quota_policy_dao),
        redis_client: data_access.redis_client,
        token_usage_dao: data_access.token_usage_dao,
        audit_log_dao: data_access.audit_log_dao,
        pg_pool: data_access.pg_pool,
    };

    let middleware_state = MiddlewareState {
        master_api_key: cfg.master_api_key,
        rate_limit_per_min: cfg.rate_limit_per_min,
        rate_limit_tenant_per_min: cfg.rate_limit_tenant_per_min,
        rate_limit_route_per_min: cfg.rate_limit_route_per_min,
        rate_limit_model_per_min: cfg.rate_limit_model_per_min,
        rate_limit_window_ms: cfg.rate_limit_window_ms,
        rate_limit_fail_open: cfg.rate_limit_fail_open,
        rate_limit_dao: data_access.rate_limit_dao,
        tenant_dao: data_access.tenant_dao,
    };

    let router = build_router(app_state)
        .layer(middleware::from_fn_with_state(
            middleware_state.clone(),
            crate::interfaces::http::middleware::auth::auth,
        ))
        .layer(middleware::from_fn_with_state(
            middleware_state.clone(),
            crate::interfaces::http::middleware::content_filter::content_filter,
        ))
        .layer(middleware::from_fn_with_state(
            middleware_state,
            crate::interfaces::http::middleware::rate_limit::rate_limit,
        ))
        .layer(middleware::from_fn(
            crate::interfaces::http::middleware::request_id::request_id,
        ));

    Ok(App {
        name: cfg.app_name,
        addr: cfg.http_addr,
        router,
    })
}
