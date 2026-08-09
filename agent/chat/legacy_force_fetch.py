from __future__ import annotations

import json
from collections.abc import Awaitable, Callable

from chat.stream_message_utils import extract_first_url
from chat.stream_protocol import build_tool_error_payload
from graph.tool_result_mapper import build_tool_result_payload
from json_types import JsonObject

WEB_FETCH_TOOL_NAME = "web_fetch"
WEB_FETCH_TOOL_CALL_ID = "web_fetch-1"
WEB_FETCH_MAX_CONTENT_LENGTH = 4000


def resolve_force_fetch_url(*, matched_tools: list[str], user_query: str) -> str:
    if WEB_FETCH_TOOL_NAME not in matched_tools:
        return ""
    return extract_first_url(user_query)


async def execute_legacy_force_fetch(
    *,
    url: str,
    tool_executor: Callable[[str, JsonObject], Awaitable[str]],
) -> tuple[list[JsonObject], str]:
    tool_input = {"url": url, "max_content_length": WEB_FETCH_MAX_CONTENT_LENGTH}
    raw_output = await tool_executor(WEB_FETCH_TOOL_NAME, tool_input)
    payload = _parse_tool_output(raw_output)
    status = str(payload.get("status", "error"))
    base_payload = {
        "tool_name": WEB_FETCH_TOOL_NAME,
        "tool_call_id": WEB_FETCH_TOOL_CALL_ID,
        "attempt": 1,
        "status": status,
        "message": payload.get("message", "tool execute failed"),
    }
    result_event = (
        {
            "event": "tool_result",
            "payload": build_tool_result_payload(WEB_FETCH_TOOL_NAME, base_payload, payload),
        }
        if payload.get("ok")
        else {
            "event": "tool_error",
            "payload": build_tool_error_payload(
                base_payload,
                status,
                str(payload.get("message", "tool execute failed")),
                False,
            ),
        }
    )
    return [build_legacy_force_fetch_use_event(url), result_event], build_force_fetch_context_prompt(payload)


def build_legacy_force_fetch_use_event(url: str) -> JsonObject:
    return {
        "event": "tool_use",
        "payload": {
            "tool_name": WEB_FETCH_TOOL_NAME,
            "tool_call_id": WEB_FETCH_TOOL_CALL_ID,
            "input": {"url": url, "max_content_length": WEB_FETCH_MAX_CONTENT_LENGTH},
        },
    }


def build_force_fetch_context_prompt(payload: JsonObject) -> str:
    fetched_items = payload.get("items", [])
    if not isinstance(fetched_items, list) or not fetched_items:
        return ""
    first = fetched_items[0] if isinstance(fetched_items[0], dict) else {}
    content = str(first.get("content", "") or "").strip()
    if not content:
        return ""
    return "请严格基于以下网页原文回答，并明确标注不确定处：\n" + content[:WEB_FETCH_MAX_CONTENT_LENGTH]


def _parse_tool_output(raw_output: str) -> JsonObject:
    try:
        return json.loads(raw_output) if raw_output else {}
    except Exception:
        return {}
