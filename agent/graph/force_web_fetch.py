from __future__ import annotations

import json
from collections.abc import Awaitable, Callable

from json_types import JsonObject
from llm.chat_message import ChatMessage

from .state import GraphState
from .tool_result_mapper import build_tool_result_payload

EmitFn = Callable[[str, JsonObject], Awaitable[None]]
ExecuteToolFn = Callable[..., Awaitable[str]]


async def execute_forced_web_fetch(
    *,
    state: GraphState,
    force_fetch_url: str,
    emit: EmitFn,
    execute_tool: ExecuteToolFn,
) -> ChatMessage | None:
    await emit(
        "tool_use",
        {
            "tool_name": "web_fetch",
            "tool_call_id": "web_fetch-1",
            "input": {"url": force_fetch_url, "max_content_length": 4000},
        },
    )
    forced_output = await execute_tool(
        tool_name="web_fetch",
        tool_args={"url": force_fetch_url, "max_content_length": 4000},
        state=state,
    )
    try:
        forced_payload = json.loads(forced_output) if forced_output else {}
    except Exception:
        forced_payload = {}
    forced_status = str(forced_payload.get("status", "error") or "error")
    forced_base_payload = {
        "tool_name": "web_fetch",
        "tool_call_id": "web_fetch-1",
        "attempt": 1,
        "status": forced_status,
        "message": forced_payload.get("message", "tool execute failed"),
    }
    if not forced_payload.get("ok"):
        await emit(
            "tool_error",
            {
                **forced_base_payload,
                "code": forced_status,
                "retryable": False,
            },
        )
        return None

    await emit(
        "tool_result",
        build_tool_result_payload("web_fetch", forced_base_payload, forced_payload),
    )
    forced_items = forced_payload.get("items")
    has_items = isinstance(forced_items, list) and bool(forced_items)
    if forced_status != "hit" or not has_items:
        return None

    first_item = forced_items[0] if isinstance(forced_items[0], dict) else {}
    content = str(first_item.get("content", "") or first_item.get("snippet", "") or "")
    if not content:
        return None
    return ChatMessage(
        role="system",
        content=(
            "已获取用户给定 URL 的页面内容，请优先基于该内容回答；"
            "若内容不完整再明确说明缺失点。\n\n"
            f"URL: {force_fetch_url}\n"
            f"内容摘录:\n{content[:4000]}"
        ),
    )
