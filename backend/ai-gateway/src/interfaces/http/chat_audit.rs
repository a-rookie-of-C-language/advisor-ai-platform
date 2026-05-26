use std::time::Duration;

use axum::http::StatusCode;

use crate::domain::core::tenant_access_control::TenantIdentity::TenantIdentity;
use crate::domain::supporting::observability_audit::TraceRecord::{AuditLog, TraceRecord};
use crate::infrastructure::http::AppState::AppState;

pub async fn persist_chat_audit(
    state: &AppState,
    tenant: &TenantIdentity,
    trace: &TraceRecord,
    method: &str,
    path: &str,
    status_code: StatusCode,
    duration: Duration,
    error_message: Option<String>,
) {
    if let Some(dao) = &state.audit_log_dao {
        let log = build_chat_audit_log(
            tenant,
            trace,
            method,
            path,
            status_code,
            duration,
            error_message,
        );
        if let Err(err) = dao.insert(&log).await {
            tracing::warn!(
                request_id = %trace.request_id,
                error = %err,
                "failed to persist chat audit log"
            );
        }
    }
}

fn build_chat_audit_log(
    tenant: &TenantIdentity,
    trace: &TraceRecord,
    method: &str,
    path: &str,
    status_code: StatusCode,
    duration: Duration,
    error_message: Option<String>,
) -> AuditLog {
    AuditLog {
        request_id: trace.request_id.clone(),
        tenant_id: tenant.tenant_id.clone(),
        app_id: tenant.app_id.clone(),
        method: method.to_string(),
        path: path.to_string(),
        status_code: status_code.as_u16(),
        duration_ms: duration.as_millis().min(u128::from(u64::MAX)) as u64,
        error_message,
        created_at: chrono::Utc::now(),
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use axum::http::StatusCode;

    use super::build_chat_audit_log;
    use crate::domain::core::tenant_access_control::TenantIdentity::TenantIdentity;
    use crate::domain::supporting::observability_audit::TraceRecord::TraceRecord;

    #[test]
    fn build_chat_audit_log_should_map_request_context() {
        let tenant = TenantIdentity {
            tenant_id: "tenant-1".to_string(),
            app_id: "app-1".to_string(),
        };
        let trace = TraceRecord {
            request_id: "req-1".to_string(),
            provider: "openai-compatible".to_string(),
            span_id: None,
        };

        let log = build_chat_audit_log(
            &tenant,
            &trace,
            "POST",
            "/v1/chat/completions",
            StatusCode::BAD_GATEWAY,
            Duration::from_millis(42),
            Some("upstream service error".to_string()),
        );

        assert_eq!(log.request_id, "req-1");
        assert_eq!(log.tenant_id, "tenant-1");
        assert_eq!(log.app_id, "app-1");
        assert_eq!(log.method, "POST");
        assert_eq!(log.path, "/v1/chat/completions");
        assert_eq!(log.status_code, 502);
        assert_eq!(log.duration_ms, 42);
        assert_eq!(log.error_message.as_deref(), Some("upstream service error"));
    }
}
