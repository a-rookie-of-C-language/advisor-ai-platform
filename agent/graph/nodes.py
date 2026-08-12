from __future__ import annotations

import logging
from typing import Any

from routing.intent_router import emit_route_observation

from .generation_node_flow import run_generate_node
from .memory_flush_node_flow import run_flush_memory_node
from .memory_node_flow import load_graph_memory
from .node_runtime import runtime as _runtime
from .rag_tool_node_flow import run_rag_tool_node
from .skill_selection_flow import select_graph_skills
from .state import GraphState
from .tool_decision_flow import decide_graph_tools

logger = logging.getLogger(__name__)


async def _emit(event: str, data: dict[str, Any]) -> None:
    runtime = _runtime()
    queue = getattr(runtime, "queue", None)
    if queue is None:
        return
    await queue.put({"event": event, "data": data})


async def _execute_tool(*, tool_name: str, tool_args: dict[str, Any], state: GraphState) -> str:
    runtime = _runtime()
    return await runtime.tools.execute(
        tool_name,
        tool_args,
        {
            "user_id": state.get("user_id"),
            "session_id": state.get("session_id"),
            "kb_id": state.get("kb_id"),
            "user_query": state.get("user_query", ""),
            "trace_id": state.get("trace_id"),
            "turn_id": state.get("turn_id"),
            "permission_config": runtime.tool_permission,
        },
    )


async def select_skill_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    return await select_graph_skills(state=state, runtime=runtime, logger=logger)


async def load_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    return await load_graph_memory(state=state, runtime=runtime, logger=logger)


async def decide_tool_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    return await decide_graph_tools(
        state=state,
        runtime=runtime,
        emit=_emit,
        route_observer=emit_route_observation,
        logger=logger,
    )


async def call_rag_tool_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    return await run_rag_tool_node(state=state, runtime=runtime, emit=_emit, logger=logger)


async def generate_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    return await run_generate_node(
        state=state,
        runtime=runtime,
        emit=_emit,
        execute_tool=_execute_tool,
        logger=logger,
    )


async def flush_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    return await run_flush_memory_node(state=state, runtime=runtime, logger=logger)


async def finalize_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    logger.info(
        "graph_node finalize: session_id=%s, answer_len=%s",
        state.get("session_id"),
        len(state.get("assistant_answer", "")),
    )
    if runtime.debug_stream:
        logger.info(
            "debug_stream python done: deltas=%s, answer_preview=%s",
            state.get("debug_delta_count", 0),
            state.get("debug_preview", ""),
        )
    return {}
