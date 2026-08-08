use axum::{
    body::{to_bytes, Body},
    http::Request,
};
use serde_json::Value;

const MAX_MODEL_PARSE_BODY_BYTES: usize = 1024 * 1024;

pub async fn resolve_request_model(req: &mut Request<Body>, route_path: &str) -> String {
    let mut model = req
        .headers()
        .get("x-model")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if model.is_none() && is_chat_route(route_path) {
        model = extract_model_from_body(req).await;
    }

    model.unwrap_or_else(|| "default".to_string())
}

fn is_chat_route(route_path: &str) -> bool {
    route_path == "/v1/chat/completions" || route_path == "/v1/chat/stream"
}

async fn extract_model_from_body(req: &mut Request<Body>) -> Option<String> {
    let (parts, body) = std::mem::replace(req, Request::new(Body::empty())).into_parts();
    let bytes = match to_bytes(body, MAX_MODEL_PARSE_BODY_BYTES).await {
        Ok(b) => b,
        Err(_) => {
            *req = Request::from_parts(parts, Body::empty());
            return None;
        }
    };

    let model = serde_json::from_slice::<Value>(&bytes)
        .ok()
        .and_then(|v| {
            v.get("model")
                .and_then(Value::as_str)
                .map(|s| s.trim().to_string())
        })
        .filter(|s| !s.is_empty());

    *req = Request::from_parts(parts, Body::from(bytes));
    model
}
