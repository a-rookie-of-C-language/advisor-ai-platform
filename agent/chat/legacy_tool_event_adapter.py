from __future__ import annotations

import json
import logging

from chat.stream_protocol import build_tool_error_payload
from graph.tool_result_mapper import build_tool_result_payload
from json_types import JsonObject
from llm.llm_stream_event import LLMStreamEvent

logger = logging.getLogger(__name__)


def build_legacy_tool_protocol_event(event: LLMStreamEvent) -> JsonObject | None:
    if event.type == "tool_call":
        return {
            "event": "tool_use",
            "payload": {
                "tool_name": event.tool_name,
                "tool_call_id": _tool_call_id(event),
                "input": event.tool_args or {},
            },
        }
    if event.type != "tool_result":
        return None

    payload = _parse_tool_output(event)
    base_payload = {
        "tool_name": event.tool_name,
        "tool_call_id": _tool_call_id(event),
        "attempt": event.attempt,
        "status": payload.get("status", "error"),
        "message": payload.get("message", "tool execute failed"),
    }
    if event.success:
        return {
            "event": "tool_result",
            "payload": build_tool_result_payload(event.tool_name, base_payload, payload),
        }
    return {
        "event": "tool_error",
        "payload": build_tool_error_payload(
            base_payload,
            str(payload.get("status", "error") or "error"),
            str(payload.get("message", "tool execute failed")),
            False,
        ),
    }


def is_legacy_tool_result_event(event: LLMStreamEvent) -> bool:
    return event.type == "tool_result"


def _tool_call_id(event: LLMStreamEvent) -> str:
    return f"{event.tool_name}-{event.attempt or 1}"


def _parse_tool_output(event: LLMStreamEvent) -> JsonObject:
    try:
        return json.loads(event.tool_output) if event.tool_output else {}
    except Exception:
        logger.warning(
            "tool_output parse failed: tool=%s, output=%s",
            event.tool_name,
            (event.tool_output or "")[:200],
        )
        return {}
