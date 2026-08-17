use anyhow::{Context, Result};
use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::Value;
use std::io::{BufRead, BufReader, Write};
use std::time::Duration;

use crate::provider::{ProviderErrorCode, ProviderStreamChunk};

#[derive(Debug, Deserialize)]
struct StreamChatRequest {
    url: String,
    api_key: String,
    model: String,
    temperature: f64,
    request_timeout_ms: u64,
    messages: Vec<Value>,
    #[serde(default)]
    tools: Vec<Value>,
}

pub(crate) struct OpenAiStreamRunner;

impl OpenAiStreamRunner {
    pub(crate) fn run(input: &str) -> Result<()> {
        let request: StreamChatRequest =
            serde_json::from_str(input).context("invalid stream-chat request")?;
        let body = Self::request_body(&request);
        let client = Client::builder()
            .timeout(Duration::from_millis(request.request_timeout_ms))
            .build()
            .context("failed to build OpenAI HTTP client")?;
        let response = match client
            .post(&request.url)
            .bearer_auth(&request.api_key)
            .json(&body)
            .send()
        {
            Ok(response) => response,
            Err(error) => {
                let code = if error.is_timeout() {
                    ProviderErrorCode::Timeout
                } else {
                    ProviderErrorCode::Transport
                };
                Self::write_error(code, error.to_string())?;
                return Ok(());
            }
        };

        if !response.status().is_success() {
            let status = response.status();
            let code = match status.as_u16() {
                401 | 403 => ProviderErrorCode::Auth,
                408 | 429 => ProviderErrorCode::RateLimit,
                400..=499 => ProviderErrorCode::InvalidRequest,
                _ => ProviderErrorCode::Server,
            };
            Self::write_error(code, format!("OpenAI stream request failed: HTTP {status}"))?;
            return Ok(());
        }

        Self::write_events(response)
    }

    fn request_body(request: &StreamChatRequest) -> Value {
        let mut body = serde_json::json!({
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature,
            "stream": true,
        });
        if !request.tools.is_empty() {
            body["tools"] = Value::Array(request.tools.clone());
            body["tool_choice"] = Value::String("auto".to_owned());
        }
        body
    }

    fn write_events<R: std::io::Read>(reader: R) -> Result<()> {
        let mut output = io::stdout().lock();
        Self::write_events_to(BufReader::new(reader), &mut output)
    }

    fn write_error(code: ProviderErrorCode, message: String) -> Result<()> {
        let mut output = io::stdout().lock();
        let code_value =
            serde_json::to_value(code).context("failed to serialize provider error code")?;
        Self::write_event(
            &mut output,
            ProviderStreamChunk::Error {
                code: code_value
                    .as_str()
                    .expect("provider error code is a string")
                    .to_owned(),
                message,
                retryable: code.retryable(),
            },
        )?;
        output.flush().context("failed to flush provider error")
    }

    fn write_events_to<R: BufRead, W: Write>(reader: R, output: &mut W) -> Result<()> {
        let mut finish_reason = None;
        for line in reader.lines() {
            let line = line.context("failed to read OpenAI stream")?;
            let Some(data) = line.strip_prefix("data:") else {
                continue;
            };
            let data = data.trim();
            if data == "[DONE]" {
                break;
            }
            let chunk: Value = serde_json::from_str(data).context("invalid OpenAI stream chunk")?;
            if let Some(text) = chunk["choices"][0]["delta"]["content"].as_str() {
                if !text.is_empty() {
                    Self::write_event(
                        output,
                        ProviderStreamChunk::TextDelta {
                            text: text.to_owned(),
                        },
                    )?;
                }
            }
            Self::write_tool_call_deltas(output, &chunk)?;
            if let Some(reason) = chunk["choices"][0]["finish_reason"].as_str() {
                finish_reason = Some(reason.to_owned());
            }
        }
        Self::write_event(
            output,
            ProviderStreamChunk::Finish {
                reason: finish_reason,
            },
        )?;
        output.flush().context("failed to flush stream events")?;
        Ok(())
    }

    fn write_tool_call_deltas(output: &mut impl Write, chunk: &Value) -> Result<()> {
        let Some(calls) = chunk["choices"][0]["delta"]["tool_calls"].as_array() else {
            return Ok(());
        };
        for call in calls {
            let index = call["index"].as_u64().unwrap_or(0) as usize;
            Self::write_event(
                output,
                ProviderStreamChunk::ToolCallDelta {
                    index,
                    id: call["id"].as_str().map(str::to_owned),
                    name: call["function"]["name"].as_str().map(str::to_owned),
                    arguments_delta: call["function"]["arguments"]
                        .as_str()
                        .unwrap_or_default()
                        .to_owned(),
                },
            )?;
        }
        Ok(())
    }

    fn write_event(output: &mut impl Write, event: ProviderStreamChunk) -> Result<()> {
        serde_json::to_writer(&mut *output, &event).context("failed to serialize stream event")?;
        output
            .write_all(b"\n")
            .context("failed to write stream event")?;
        output.flush().context("failed to flush stream event")?;
        Ok(())
    }
}

use std::io;

#[cfg(test)]
mod tests {
    use super::{OpenAiStreamRunner, StreamChatRequest};
    use serde_json::json;
    use std::io::Cursor;

    #[test]
    fn ignores_non_data_lines_and_parses_delta() {
        let input = b": keep-alive\ndata: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\ndata: {\"choices\":[{\"finish_reason\":\"stop\"}]}\ndata: [DONE]\n";
        let mut output = Vec::new();
        let result = OpenAiStreamRunner::write_events_to(Cursor::new(input), &mut output);

        assert!(result.is_ok());
        let events: Vec<serde_json::Value> = String::from_utf8(output)
            .expect("output should be UTF-8")
            .lines()
            .map(|line| serde_json::from_str(line).expect("output should be JSON"))
            .collect();
        assert_eq!(events[0], json!({"type": "text_delta", "text": "hi"}));
        assert_eq!(events[1], json!({"type": "finish", "reason": "stop"}));
    }

    #[test]
    fn merges_tool_call_deltas_before_done() {
        let input = concat!(
            r#"data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_","function":{"name":"search","arguments":"{\"q\":\"hel"}}]}}]}"#,
            "\n",
            r#"data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"1","function":{"arguments":"lo\"}"}}]},"finish_reason":"tool_calls"}]}"#,
            "\n",
            "data: [DONE]\n"
        );
        let mut output = Vec::new();
        OpenAiStreamRunner::write_events_to(Cursor::new(input), &mut output)
            .expect("tool call stream should parse");

        let events: Vec<serde_json::Value> = String::from_utf8(output)
            .expect("output should be UTF-8")
            .lines()
            .map(|line| serde_json::from_str(line).expect("output should be JSON"))
            .collect();
        assert_eq!(
            events[0],
            json!({
                "type": "tool_call_delta",
                "index": 0,
                "id": "call_",
                "name": "search",
                "arguments_delta": "{\"q\":\"hel"
            })
        );
        assert_eq!(
            events[1],
            json!({
                "type": "tool_call_delta",
                "index": 0,
                "id": "1",
                "name": null,
                "arguments_delta": "lo\"}"
            })
        );
        assert_eq!(events[2], json!({"type": "finish", "reason": "tool_calls"}));
    }

    #[test]
    fn builds_tool_request_body_when_tools_are_present() {
        let request = StreamChatRequest {
            url: "http://localhost".to_owned(),
            api_key: "key".to_owned(),
            model: "model".to_owned(),
            temperature: 0.2,
            request_timeout_ms: 10_000,
            messages: Vec::new(),
            tools: vec![json!({"type": "function"})],
        };
        let body = OpenAiStreamRunner::request_body(&request);

        assert_eq!(body["tools"][0]["type"], "function");
        assert_eq!(body["tool_choice"], "auto");
        assert_eq!(body["stream"], true);
    }
}
