use reqwest::Response;
use serde_json::Value;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};
use tokio_stream::wrappers::ReceiverStream;

use crate::domain::core::quota_billing::StreamingCompletion::StreamingCompletion;
use crate::domain::core::quota_billing::TokenUsage::TokenUsage;
use crate::infrastructure::provider::OpenAIStreamUsageParser::build_stream_token_usage;

pub fn build_streaming_completion(response: Response) -> StreamingCompletion {
    let mut upstream = response.bytes_stream();
    let (tx, rx) = mpsc::channel::<anyhow::Result<Value>>(128);
    let (usage_tx, usage_rx) = oneshot::channel::<Option<TokenUsage>>();

    let chunk_timeout = Duration::from_secs(30);
    let max_consecutive_timeouts = 3;

    tokio::spawn(async move {
        use futures_util::StreamExt;
        let mut buf: Vec<u8> = Vec::new();
        let mut last_usage: Option<TokenUsage> = None;
        let mut consecutive_timeouts = 0u32;

        loop {
            match tokio::time::timeout(chunk_timeout, upstream.next()).await {
                Ok(Some(item)) => {
                    consecutive_timeouts = 0;
                    match item {
                        Ok(bytes) => {
                            buf.extend_from_slice(&bytes);
                            while let Some(idx) = buf.iter().position(|&b| b == b'\n') {
                                let line_bytes = buf[..idx].to_vec();
                                buf.drain(..idx + 1);

                                let line = match std::str::from_utf8(&line_bytes) {
                                    Ok(s) => s.trim().to_string(),
                                    Err(_) => continue,
                                };

                                if !line.starts_with("data:") {
                                    continue;
                                }
                                let payload = line.trim_start_matches("data:").trim();
                                if payload == "[DONE]" {
                                    break;
                                }
                                match serde_json::from_str::<Value>(payload) {
                                    Ok(node) => {
                                        if let Some(usage_obj) = node.get("usage") {
                                            last_usage =
                                                Some(build_stream_token_usage(&node, usage_obj));
                                            continue;
                                        }
                                        if tx.send(Ok(node)).await.is_err() {
                                            let _ = usage_tx.send(last_usage);
                                            return;
                                        }
                                    }
                                    Err(e) => {
                                        tracing::warn!(
                                            "failed to parse SSE payload: {}, raw: {}",
                                            e,
                                            payload
                                        );
                                        continue;
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            let _ = tx.send(Err(anyhow::anyhow!(e))).await;
                            let _ = usage_tx.send(last_usage);
                            return;
                        }
                    }
                }
                Ok(None) => {
                    break;
                }
                Err(_) => {
                    consecutive_timeouts += 1;
                    tracing::warn!(
                        consecutive_timeouts,
                        max_consecutive_timeouts,
                        "upstream SSE chunk timeout"
                    );
                    if consecutive_timeouts >= max_consecutive_timeouts {
                        tracing::error!("upstream SSE too many consecutive timeouts, aborting");
                        let _ = tx
                            .send(Err(anyhow::anyhow!("upstream stream timeout")))
                            .await;
                        let _ = usage_tx.send(last_usage);
                        return;
                    }
                    if tx
                        .send(Ok(serde_json::json!({"type": "keepalive"})))
                        .await
                        .is_err()
                    {
                        let _ = usage_tx.send(last_usage);
                        return;
                    }
                }
            }
        }
        let _ = usage_tx.send(last_usage);
    });

    StreamingCompletion {
        stream: Box::pin(ReceiverStream::new(rx)),
        usage_rx,
    }
}
