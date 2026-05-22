from __future__ import annotations

import asyncio
import json
import logging
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

from .state import GraphState

logger = logging.getLogger(__name__)

_runtime_var: ContextVar["GraphRuntime"] = ContextVar("graph_runtime")


@dataclass
class GraphRuntime:
    queue: asyncio.Queue[dict[str, Any]]
    provider: Any
    memory_orchestrator: Any
    memory_injector: Any
    llm_extractor: Any
    tools: Any
    tool_permission: Any
    enable_tool_use: bool
    debug_stream: bool
    trace_id: str = ""
    turn_id: str = ""
    skill_registry: Any = None
    intent_router: Any = None
    safety_pipeline: Any = None
    fusion_pipeline: Any = None
    web_search_subagent: Any = None


def set_runtime(runtime: GraphRuntime):
    return _runtime_var.set(runtime)


def reset_runtime(token) -> None:
    _runtime_var.reset(token)


def _runtime() -> GraphRuntime:
    return _runtime_var.get()


async def _emit(event: str, data: dict[str, Any]) -> None:
    await _runtime().queue.put({"event": event, "data": data})


async def _execute_tool(
    *,
    tool_name: str,
    tool_args: dict[str, Any],
    state: GraphState,
) -> str:
    runtime = _runtime()
    result_json = await runtime.tools.execute(
        tool_name,
        tool_args,
        {
            "user_id": state.get("user_id"),
            "session_id": state.get("session_id"),
            "kb_id": 0,
            "user_query": state.get("user_query", ""),
            "permission_config": runtime.tool_permission,
        },
    )
    if tool_name != "web_fetch" or runtime.tools.get("web_search") is None:
        return result_json

    try:
        payload = json.loads(result_json)
    except Exception:  # noqa: BLE001
        return result_json

    status = str(payload.get("status", "") or "")
    ok = bool(payload.get("ok", False))
    items = payload.get("items")
    has_items = isinstance(items, list) and bool(items)
    if ok and status == "hit" and has_items:
        return result_json

    fallback_query = str(tool_args.get("url", "") or state.get("user_query", "")).strip()
    if not fallback_query:
        return result_json

    logger.info(
        "tool_fallback web_fetch->web_search: session_id=%s, user_id=%s, query=%s",
        state.get("session_id"),
        state.get("user_id"),
        fallback_query[:120],
    )
    return await runtime.tools.execute(
        "web_search",
        {"query": fallback_query, "max_results": 5},
        {
            "user_id": state.get("user_id"),
            "session_id": state.get("session_id"),
            "kb_id": 0,
            "user_query": state.get("user_query", ""),
            "permission_config": runtime.tool_permission,
        },
    )
