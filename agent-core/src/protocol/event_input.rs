use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProtocolEventInput {
    pub(crate) event: String,
    pub(crate) source: Option<String>,
    pub(crate) trace_id: Option<String>,
    pub(crate) payload: Value,
}
