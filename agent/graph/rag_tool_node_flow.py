from __future__ import annotations

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
    try:
        payload = await runtime.tools.execute(
            "rag_search",
            {"query": state.get("user_query", ""), "top_k": 5},
            {
                "user_id": state.get("user_id"),
                "session_id": state.get("session_id"),
                "kb_id": state.get("kb_id"),
                "user_query": state.get("user_query", ""),
                "trace_id": state.get("trace_id"),
                "turn_id": state.get("turn_id"),
            },
        )
        parsed = json.loads(payload) if payload else {}
    except Exception as exc:  # noqa: BLE001
        parsed = {
            "status": "error",
            "message": f"tool_execute_failed: {exc}",
            "items": [],
        }

    await emit("sources", build_rag_sources_payload(parsed))
    model_messages = list(state.get("model_messages", state.get("messages", [])))
    model_messages = append_rag_context(model_messages, parsed)
    return {"model_messages": model_messages}
