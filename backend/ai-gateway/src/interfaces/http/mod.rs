pub mod middleware;

#[allow(non_snake_case)]
#[path = "audit/chat_audit.rs"]
pub mod chat_audit;
#[allow(non_snake_case)]
#[path = "usage/chat_completion_usage.rs"]
pub mod chat_completion_usage;
#[allow(non_snake_case)]
#[path = "chat/chat_completions.rs"]
pub mod chat_completions;
#[allow(non_snake_case)]
#[path = "chat/chat_stream.rs"]
pub mod chat_stream;
#[allow(non_snake_case)]
#[path = "usage/chat_stream_usage.rs"]
pub mod chat_stream_usage;
#[allow(non_snake_case)]
#[path = "health/health.rs"]
pub mod health;
