from __future__ import annotations

import asyncio
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
    return await runtime.tools.execute(
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