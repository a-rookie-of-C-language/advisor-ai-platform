use crate::protocol_envelope::ProtocolEnvelope;
use crate::protocol_event_input::ProtocolEventInput;
use anyhow::Result;
use time::OffsetDateTime;

const EVENT_VERSION: &str = "1.0";

pub(crate) struct SseEventSerializer;

impl SseEventSerializer {
    pub(crate) fn serialize(input: ProtocolEventInput) -> Result<String> {
        let envelope = ProtocolEnvelope {
            event_version: EVENT_VERSION,
            trace_id: input.trace_id.unwrap_or_default(),
            timestamp: OffsetDateTime::now_utc().unix_timestamp_nanos() / 1_000_000,
            source: input.source.unwrap_or_else(|| "system".to_string()),
            payload: input.payload,
        };
        let data = serde_json::to_string(&envelope)?;
        Ok(format!("event: {}\ndata: {}\n\n", input.event, data))
    }
}
