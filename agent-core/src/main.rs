use anyhow::{anyhow, Result};
use core_command_runner::CoreCommandRunner;
use std::env;

mod core_command_runner;
mod protocol_envelope;
mod protocol_event_input;
mod sse_event_serializer;

fn main() -> Result<()> {
    let command = env::args()
        .nth(1)
        .ok_or_else(|| anyhow!("missing command: expected `sse-event` or `health`"))?;

    CoreCommandRunner::run(command.as_str())
}
