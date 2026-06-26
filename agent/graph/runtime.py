from __future__ import annotations

import asyncio
import json
import logging
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Awaitable, Callable

from agents.search.web_search_subagent import WebSearchSubAgent
from agents.task_planner.TaskPlannerSubAgent import TaskPlannerSubAgent
from context.memory.memory_injector import MemoryInjector
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from fusion.registry import SourcePriorityRegistry
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from safety.safety_pipeline import SafetyPipeline
from skills.skill_registry import SkillRegistry
from routing.intent_router import IntentRouter
from tools.permissions.tool_permission import PermissionConfig
from tools.registry.tool_registry import ToolRegistry

from .permission_config_utils import permission_config_to_json
from .state import GraphState

logger = logging.getLogger(__name__)

_runtime_var: ContextVar["GraphRuntime"] = ContextVar("graph_runtime")


@dataclass
class GraphRuntime:
    queue: asyncio.Queue[JsonObject]
    provider: BaseLLMProvider
    memory_orchestrator: MemoryOrchestrator | None
    memory_injector: MemoryInjector
    llm_extractor: Callable[[str, str], list[JsonObject] | Awaitable[list[JsonObject]]] | None
    tools: ToolRegistry
    tool_permission: PermissionConfig
    enable_tool_use: bool
    debug_stream: bool
    trace_id: str = ""
    turn_id: str = ""
    skill_registry: SkillRegistry | None = None
    intent_router: IntentRouter | None = None
    safety_pipeline: SafetyPipeline | None = None
    fusion_pipeline: SourcePriorityRegistry | None = None
    web_search_subagent: WebSearchSubAgent | None = None
    task_planner_subagent: TaskPlannerSubAgent | None = None


def set_runtime(runtime: GraphRuntime):
    return _runtime_var.set(runtime)


def reset_runtime(token) -> None:
    _runtime_var.reset(token)


def _runtime() -> GraphRuntime:
    return _runtime_var.get()


async def _emit(event: str, data: JsonObject) -> None:
    await _runtime().queue.put({"event": event, "data": data})


async def _execute_tool(
    *,
    tool_name: str,
    tool_args: JsonObject,
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
            "permission_config": permission_config_to_json(runtime.tool_permission),
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
            "permission_config": permission_config_to_json(runtime.tool_permission),
        },
    )
