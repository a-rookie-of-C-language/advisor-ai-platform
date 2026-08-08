use crate::protocol::event_input::ProtocolEventInput;
use crate::sse_event_serializer::SseEventSerializer;
use anyhow::{anyhow, Result};
use serde_json::json;
use std::io::{self, Read};

pub(crate) struct CoreCommandRunner;

impl CoreCommandRunner {
    pub(crate) fn run(command: &str) -> Result<()> {
        match command {
            "health" => {
                println!("{}", json!({"status": "ok", "core": "rust"}));
                Ok(())
            }
            "sse-event" => Self::run_sse_event(),
            other => Err(anyhow!("unsupported command: {other}")),
        }
    }

    fn run_sse_event() -> Result<()> {
        let mut input = String::new();
        io::stdin().read_to_string(&mut input)?;
        let event: ProtocolEventInput = serde_json::from_str(&input)?;
        print!("{}", SseEventSerializer::serialize(event)?);
        Ok(())
    }
}
