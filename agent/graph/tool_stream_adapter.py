from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable

from json_types import JsonObject
from llm.llm_stream_event import LLMStreamEvent
from safety.safety_pipeline import SafetyPipeline

from .tool_result_mapper import build_tool_result_payload, filter_tool_result

logger = logging.getLogger(__name__)


async def emit_graph_tool_stream_event(
    event: LLMStreamEvent,
    *,
    emit: Callable[[str, dict], Awaitable[None]],
    pipeline: SafetyPipeline | None,
    add_sensitive_count: Callable[[int], None],
) -> bool:
    if event.type == "tool_call":
        await emit(
            "tool_use",
            {
                "tool_name": event.tool_name,
                "tool_call_id": _tool_call_id(event),
                "input": event.tool_args or {},
            },
        )
        return True
    if event.type != "tool_result":
        return False

    payload = _parse_tool_output(event)
    base_payload = {
        "tool_name": event.tool_name,
        "tool_call_id": _tool_call_id(event),
        "attempt": event.attempt,
        "status": payload.get("status", "error"),
        "message": payload.get("message", "tool execute failed"),
    }
    if event.success:
        filtered_payload, sensitive_count = filter_tool_result(event.tool_name, payload, pipeline)
        add_sensitive_count(sensitive_count)
        await emit(
            "tool_result",
            build_tool_result_payload(event.tool_name, base_payload, filtered_payload),
        )
    else:
        await emit(
            "tool_error",
            {
                **base_payload,
                "code": payload.get("status", "error"),
                "retryable": False,
            },
        )
    return True


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
