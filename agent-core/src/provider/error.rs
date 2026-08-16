use serde::Serialize;

/// Stable provider failure categories shared with the TypeScript orchestrator.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub(crate) enum ProviderErrorCode {
    Auth,
    RateLimit,
    Server,
    Timeout,
    Transport,
    Quota,
    ContextWindowExceeded,
    InvalidRequest,
    EmptyResponse,
    Cancelled,
}

impl ProviderErrorCode {
    pub(crate) const fn retryable(self) -> bool {
        matches!(
            self,
            Self::RateLimit | Self::Server | Self::Timeout | Self::Transport | Self::EmptyResponse
        )
    }
}

/// Provider failure payload. The message is diagnostic and the code is the routing key.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct ProviderError {
    pub(crate) code: ProviderErrorCode,
    pub(crate) message: String,
    pub(crate) retryable: bool,
}

impl ProviderError {
    pub(crate) fn new(code: ProviderErrorCode, message: impl Into<String>) -> Self {
        Self {
            retryable: code.retryable(),
            code,
            message: message.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{ProviderError, ProviderErrorCode};

    #[test]
    fn retryability_is_derived_from_the_stable_code() {
        assert!(ProviderErrorCode::Transport.retryable());
        assert!(ProviderErrorCode::RateLimit.retryable());
        assert!(!ProviderErrorCode::Auth.retryable());
        assert!(!ProviderErrorCode::Quota.retryable());
    }

    #[test]
    fn error_serialization_exposes_machine_routing_fields() {
        let error = ProviderError::new(ProviderErrorCode::ContextWindowExceeded, "too large");
        assert_eq!(
            serde_json::to_value(error).expect("error should serialize"),
            serde_json::json!({
                "code": "CONTEXT_WINDOW_EXCEEDED",
                "message": "too large",
                "retryable": false
            })
        );
    }
}
