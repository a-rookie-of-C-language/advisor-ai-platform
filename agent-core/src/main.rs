use anyhow::Result;
use command::reader::CoreCommandReader;
use command::runner::CoreCommandRunner;

mod command;
mod protocol;
mod provider;
mod sse;
mod stream;

fn main() -> Result<()> {
    let command = CoreCommandReader::read()?;
    CoreCommandRunner::run(command.as_str())
}
