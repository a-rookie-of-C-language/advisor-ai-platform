from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from .rag_node_support import append_rag_context, build_rag_sources_payload
from .state import GraphState


async def run_rag_tool_node(
    *,
    state: GraphState,
    runtime: Any,
    emit: Callable[[str, dict[str, Any]], Awaitable[None]],
    logger: logging.Logger,
) -> GraphState:
    logger.info(
        "graph_node call_rag_tool: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, kb_id=%s",
        runtime.trace_id,
        runtime.turn_id,
        state.get("session_id"),
        state.get("user_id"),
        state.get("kb_id"),
    )

    context = {
        "user_id": state.get("user_id"),
        "session_id": state.get("session_id"),
        "kb_id": state.get("kb_id"),
        "user_query": state.get("user_query", ""),
        "trace_id": state.get("trace_id"),
        "turn_id": state.get("turn_id"),
    }

    user_query = state.get("user_query", "")
    has_web_search = runtime.tools.get("web_search") is not None

    # 并行执行 rag_search 和 web_search
    async def do_rag_search():
        try:
            payload = await runtime.tools.execute(
                "rag_search",
                {"query": user_query, "top_k": 5},
                context,
            )
            return json.loads(payload) if payload else {}
        except Exception as exc:
            logger.warning("rag_search failed: %s", exc)
            return {"status": "error", "message": str(exc), "items": []}

    async def do_web_search():
        try:
            payload = await runtime.tools.execute(
                "web_search",
                {"query": user_query, "max_results": 5},
                context,
            )
            return json.loads(payload) if payload else {}
        except Exception as exc:
            logger.warning("web_search failed: %s", exc)
            return {"status": "error", "message": str(exc), "items": []}

    # 并行执行两个搜索
    if has_web_search:
        rag_result, web_result = await asyncio.gather(
            do_rag_search(),
            do_web_search(),
        )
    else:
        rag_result = await do_rag_search()
        web_result = {"status": "skipped", "items": []}

    # 发送 rag_search 结果
    await emit("sources", build_rag_sources_payload(rag_result))

    # 发送 web_search 结果
    if has_web_search:
        await emit(
            "sources",
            {
                "tool": "web_search",
                "success": web_result.get("status") not in ("error",),
                "attempt": 1,
                "status": web_result.get("status", "error"),
                "message": web_result.get("message", "web search completed"),
                "items": web_result.get("items", []),
            },
        )

    # 合并结果：优先使用有结果的那个
    rag_items = rag_result.get("items", []) if isinstance(rag_result, dict) else []
    web_items = web_result.get("items", []) if isinstance(web_result, dict) else []

    # 合并两个来源的结果
    combined_items = []
    if rag_items:
        combined_items.extend(rag_items)
    if web_items:
        combined_items.extend(web_items)

    # 构建合并后的结果
    if combined_items:
        parsed = {
            "status": "hit",
            "message": f"found {len(combined_items)} results from rag({len(rag_items)}) + web({len(web_items)})",
            "items": combined_items,
        }
    else:
        parsed = {
            "status": "miss",
            "message": "no results from rag_search or web_search",
            "items": [],
        }

    model_messages = list(state.get("model_messages", state.get("messages", [])))
    model_messages = append_rag_context(model_messages, parsed)
    return {"model_messages": model_messages}
