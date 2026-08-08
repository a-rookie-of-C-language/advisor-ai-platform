use anyhow::Result;
use command::reader::CoreCommandReader;
use command::runner::CoreCommandRunner;

mod command;
mod protocol;
mod sse_event_serializer;

fn main() -> Result<()> {
    let command = CoreCommandReader::read()?;
    CoreCommandRunner::run(command.as_str())
}
