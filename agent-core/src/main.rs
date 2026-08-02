use anyhow::{anyhow, Result};
use protocol_event_input::ProtocolEventInput;
use serde_json::json;
use sse_event_serializer::SseEventSerializer;
use std::env;
use std::io::{self, Read};

mod protocol_envelope;
mod protocol_event_input;
mod sse_event_serializer;

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
            print!("{}", SseEventSerializer::serialize(event)?);
            Ok(())
        }
        other => Err(anyhow!("unsupported command: {other}")),
    }
}
