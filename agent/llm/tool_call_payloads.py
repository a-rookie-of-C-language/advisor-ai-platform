from __future__ import annotations

import json
from typing import Any

from llm.llm_stream_event import LLMStreamEvent


def encode_tool_calls(raw_tool_calls: list[Any]) -> list[dict[str, Any]]:
    encoded_tool_calls = []
    for raw_call in raw_tool_calls:
        encoded_tool_calls.append(
            {
                "id": raw_call.id,
                "type": "function",
                "function": {
                    "name": raw_call.function.name,
                    "arguments": raw_call.function.arguments or "{}",
                },
            }
        )
    return encoded_tool_calls


def parse_tool_output_json(tool_output: str) -> dict[str, Any]:
    try:
        payload = json.loads(tool_output) if tool_output else {}
    except (json.JSONDecodeError, TypeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def build_tool_error_output(message: str) -> str:
    return json.dumps(
        {
            "ok": False,
            "status": "error",
            "message": message,
            "items": [],
        },
        ensure_ascii=False,
    )


def build_tool_call_event(tool_name: str, tool_args: dict[str, Any]) -> LLMStreamEvent:
    return LLMStreamEvent(type="tool_call", tool_name=tool_name, tool_args=tool_args)


def build_tool_result_event(
    *,
    tool_name: str,
    tool_args: dict[str, Any],
    tool_output: str,
    attempt: int,
    success: bool,
) -> LLMStreamEvent:
    return LLMStreamEvent(
        type="tool_result",
        tool_name=tool_name,
        tool_args=tool_args,
        tool_output=tool_output,
        attempt=attempt,
        success=success,
    )
