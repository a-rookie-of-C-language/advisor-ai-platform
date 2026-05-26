use serde_json::Value;

use crate::domain::core::gateway_orchestration::CompletionResult::CompletionResult;

pub fn parse_completion_result(body: Value, default_model: &str) -> CompletionResult {
    let result_model = body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(default_model)
        .to_string();
    let content = first_choice(&body)
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let usage = body.get("usage");
    let prompt_tokens = usage
        .and_then(|u| u.get("prompt_tokens"))
        .and_then(Value::as_i64);
    let completion_tokens = usage
        .and_then(|u| u.get("completion_tokens"))
        .and_then(Value::as_i64);
    let total_tokens = usage
        .and_then(|u| u.get("total_tokens"))
        .and_then(Value::as_i64);
    let finish_reason = first_choice(&body)
        .and_then(|choice| choice.get("finish_reason"))
        .and_then(Value::as_str)
        .map(|s| s.to_string());

    CompletionResult {
        model: result_model,
        content,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        finish_reason,
    }
}

fn first_choice(body: &Value) -> Option<&Value> {
    body.get("choices")
        .and_then(Value::as_array)
        .and_then(|arr| arr.first())
}
