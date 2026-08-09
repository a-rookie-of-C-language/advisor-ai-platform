use anyhow::{anyhow, Context, Result};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader, Write};

#[derive(Debug, Deserialize)]
struct StreamChatRequest {
    url: String,
    api_key: String,
    model: String,
    temperature: f64,
    messages: Vec<Value>,
    #[serde(default)]
    tools: Vec<Value>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum StreamEvent {
    Delta {
        text: String,
    },
    ToolCall {
        tool_call_id: String,
        tool_name: String,
        tool_args: Map<String, Value>,
    },
    Done {
        finish_reason: Option<String>,
    },
}

#[derive(Default)]
struct ToolCallAccumulator {
    id: String,
    name: String,
    arguments: String,
}

pub(crate) struct OpenAiStreamRunner;

impl OpenAiStreamRunner {
    pub(crate) fn run(input: &str) -> Result<()> {
        let request: StreamChatRequest =
            serde_json::from_str(input).context("invalid stream-chat request")?;
        let body = Self::request_body(&request);
        let response = Client::new()
            .post(&request.url)
            .bearer_auth(&request.api_key)
            .json(&body)
            .send()
            .context("failed to send OpenAI stream request")?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "OpenAI stream request failed: HTTP {}",
                response.status()
            ));
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

    fn write_events_to<R: BufRead, W: Write>(reader: R, output: &mut W) -> Result<()> {
        let mut tool_calls = BTreeMap::new();
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
                        StreamEvent::Delta {
                            text: text.to_owned(),
                        },
                    )?;
                }
            }
            Self::merge_tool_calls(&mut tool_calls, &chunk);
            if let Some(reason) = chunk["choices"][0]["finish_reason"].as_str() {
                finish_reason = Some(reason.to_owned());
            }
        }
        for (_, tool_call) in tool_calls {
            let tool_args = if tool_call.arguments.trim().is_empty() {
                Map::new()
            } else {
                serde_json::from_str(&tool_call.arguments)
                    .context("invalid OpenAI tool call arguments")?
            };
            Self::write_event(
                output,
                StreamEvent::ToolCall {
                    tool_call_id: tool_call.id,
                    tool_name: tool_call.name,
                    tool_args,
                },
            )?;
        }
        Self::write_event(output, StreamEvent::Done { finish_reason })?;
        output.flush().context("failed to flush stream events")?;
        Ok(())
    }

    fn merge_tool_calls(tool_calls: &mut BTreeMap<usize, ToolCallAccumulator>, chunk: &Value) {
        let Some(calls) = chunk["choices"][0]["delta"]["tool_calls"].as_array() else {
            return;
        };
        for call in calls {
            let index = call["index"].as_u64().unwrap_or(0) as usize;
            let current = tool_calls.entry(index).or_default();
            current.id.push_str(call["id"].as_str().unwrap_or_default());
            current
                .name
                .push_str(call["function"]["name"].as_str().unwrap_or_default());
            current
                .arguments
                .push_str(call["function"]["arguments"].as_str().unwrap_or_default());
        }
    }

    fn write_event(output: &mut impl Write, event: StreamEvent) -> Result<()> {
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
        assert_eq!(events[0], json!({"type": "delta", "text": "hi"}));
        assert_eq!(events[1], json!({"type": "done", "finish_reason": "stop"}));
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
                "type": "tool_call",
                "tool_call_id": "call_1",
                "tool_name": "search",
                "tool_args": {"q": "hello"}
            })
        );
        assert_eq!(
            events[1],
            json!({"type": "done", "finish_reason": "tool_calls"})
        );
    }

    #[test]
    fn builds_tool_request_body_when_tools_are_present() {
        let request = StreamChatRequest {
            url: "http://localhost".to_owned(),
            api_key: "key".to_owned(),
            model: "model".to_owned(),
            temperature: 0.2,
            messages: Vec::new(),
            tools: vec![json!({"type": "function"})],
        };
        let body = OpenAiStreamRunner::request_body(&request);

        assert_eq!(body["tools"][0]["type"], "function");
        assert_eq!(body["tool_choice"], "auto");
        assert_eq!(body["stream"], true);
    }
}
