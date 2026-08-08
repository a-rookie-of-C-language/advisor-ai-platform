use serde_json::Value;

use crate::domain::core::quota_billing::TokenUsage::TokenUsage;

pub fn build_stream_token_usage(node: &Value, usage_obj: &Value) -> TokenUsage {
    let prompt_tokens = usage_obj
        .get("prompt_tokens")
        .and_then(Value::as_i64)
        .unwrap_or(0);
    let completion_tokens = usage_obj
        .get("completion_tokens")
        .and_then(Value::as_i64)
        .unwrap_or(0);
    let total_tokens = usage_obj
        .get("total_tokens")
        .and_then(Value::as_i64)
        .unwrap_or(0);
    let stream_model = node
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    TokenUsage {
        request_id: String::new(),
        tenant_id: String::new(),
        app_id: String::new(),
        model: stream_model,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: chrono::Utc::now(),
    }
}
