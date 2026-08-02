use anyhow::Result;
use core_command_reader::CoreCommandReader;
use core_command_runner::CoreCommandRunner;

mod core_command_reader;
mod core_command_runner;
mod protocol_envelope;
mod protocol_event_input;
mod sse_event_serializer;

fn main() -> Result<()> {
    let command = CoreCommandReader::read()?;
    CoreCommandRunner::run(command.as_str())
}
