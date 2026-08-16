mod error;
mod retry;

pub(crate) use error::ProviderErrorCode;

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub(crate) enum ProviderStreamChunk {
    TextDelta {
        text: String,
    },
    ToolCallDelta {
        index: usize,
        id: Option<String>,
        name: Option<String>,
        arguments_delta: String,
    },
    Finish {
        reason: Option<String>,
    },
    Error {
        code: String,
        message: String,
        retryable: bool,
    },
}
