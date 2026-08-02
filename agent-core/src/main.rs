use anyhow::{anyhow, Result};
use protocol_envelope::ProtocolEnvelope;
use protocol_event_input::ProtocolEventInput;
use serde_json::json;
use std::env;
use std::io::{self, Read};
use time::OffsetDateTime;

mod protocol_envelope;
mod protocol_event_input;

const EVENT_VERSION: &str = "1.0";

fn main() -> Result<()> {
    let command = env::args()
        .nth(1)
        .ok_or_else(|| anyhow!("missing command: expected `sse-event` or `health`"))?;

    match command.as_str() {
        "health" => {
            println!("{}", json!({"status": "ok", "core": "rust"}));
            Ok(())
        }
        "sse-event" => {
            let mut input = String::new();
            io::stdin().read_to_string(&mut input)?;
            let event: ProtocolEventInput = serde_json::from_str(&input)?;
            print!("{}", serialize_sse_event(event)?);
            Ok(())
        }
        other => Err(anyhow!("unsupported command: {other}")),
    }
}

fn serialize_sse_event(input: ProtocolEventInput) -> Result<String> {
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
