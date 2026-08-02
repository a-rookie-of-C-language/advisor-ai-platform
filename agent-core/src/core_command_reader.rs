use anyhow::{anyhow, Result};
use std::env;

pub(crate) struct CoreCommandReader;

impl CoreCommandReader {
    pub(crate) fn read() -> Result<String> {
        env::args()
            .nth(1)
            .ok_or_else(|| anyhow!("missing command: expected `sse-event` or `health`"))
    }
}
