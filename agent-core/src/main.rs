use anyhow::Result;
use command::reader::CoreCommandReader;
use command::runner::CoreCommandRunner;

mod command;
mod protocol_envelope;
mod protocol_event_input;
mod sse_event_serializer;

fn main() -> Result<()> {
    let command = CoreCommandReader::read()?;
    CoreCommandRunner::run(command.as_str())
}
