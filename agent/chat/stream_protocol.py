from __future__ import annotations

import json
import time

from json_types import JsonObject

EVENT_VERSION = "1.0"


def serialize_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def event_envelope(
    *,
    source: str,
    trace_id: str | None,
    payload: JsonObject,
) -> JsonObject:
    return {
        "event_version": EVENT_VERSION,
        "trace_id": trace_id or "",
        "timestamp": int(time.time() * 1000),
        "source": source,
        "payload": payload,
    }


def serialize_protocol_event(
    *,
    event: str,
    source: str,
    trace_id: str | None,
    payload: JsonObject,
) -> str:
    return serialize_event(
        event,
        event_envelope(source=source, trace_id=trace_id, payload=payload),
    )


def build_stream_error_payload(code: str, message: str, retryable: bool) -> JsonObject:
    return {
        "code": code,
        "message": message,
        "retryable": retryable,
    }


def build_tool_error_payload(
    base_payload: JsonObject,
    code: str,
    message: str,
    retryable: bool,
) -> JsonObject:
    return {
        **base_payload,
        "code": code,
        "message": message,
        "retryable": retryable,
    }
