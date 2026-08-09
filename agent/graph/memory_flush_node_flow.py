from __future__ import annotations

import logging
from typing import Any

from .state import GraphState


async def run_flush_memory_node(
    *,
    state: GraphState,
    runtime: Any,
    logger: logging.Logger,
) -> GraphState:
    logger.info(
        "graph_node flush_memory: session_id=%s, memory_enabled=%s",
        state.get("session_id"),
        state.get("memory_enabled"),
    )
    answer = state.get("assistant_answer", "").strip()
    if state.get("stream_failed"):
        return {}
    if not state.get("memory_enabled") or not answer or runtime.memory_orchestrator is None:
        return {}

    try:
        messages = list(state.get("messages", []))
        await runtime.memory_orchestrator.flush(
            user_id=state.get("user_id"),
            session_id=state.get("session_id"),
            kb_id=0,
            user_text=state.get("user_query", ""),
            assistant_text=answer,
            recent_messages=[{"role": item.role, "content": item.content} for item in messages]
            + [{"role": "assistant", "content": answer}],
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Memory flush failed, skip writeback: %s", exc)
    return {}
