use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Serialize)]
pub(crate) struct ProtocolEnvelope {
    pub(crate) event_version: &'static str,
    pub(crate) trace_id: String,
    pub(crate) timestamp: i128,
    pub(crate) source: String,
    pub(crate) payload: Value,
}
