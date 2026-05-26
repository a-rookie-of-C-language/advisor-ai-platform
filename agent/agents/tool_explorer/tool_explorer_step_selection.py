from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from agents.tool_explorer.ToolExplorerStep import ToolExplorerStep
from agents.tool_explorer.tool_explorer_support import (
    contextual_followup_step,
    planned_step,
)
from json_types import JsonObject
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec

StepPlanner = Callable[..., Awaitable[ToolExplorerStep]]


async def select_next_tool_explorer_step(
    *,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    candidate_names: set[str],
    initial_route: JsonObject,
    task_plan: JsonObject | None,
    observations: list[JsonObject],
    plan_step: StepPlanner,
) -> ToolExplorerStep | None:
    step = planned_step(
        task_plan=task_plan,
        available_tools=available_tools,
        observations=observations,
    )
    if step is not None:
        return step

    step = contextual_followup_step(
        user_query=user_query,
        recent_messages=recent_messages,
        available_tools=available_tools,
        observations=observations,
    )
    if step is not None:
        return step

    planner_kwargs: dict[str, Any] = {
        "user_query": user_query,
        "recent_messages": recent_messages,
        "available_tools": available_tools,
        "candidate_names": candidate_names,
        "initial_route": initial_route,
        "task_plan": task_plan,
        "observations": observations,
    }
    return await plan_step(
        **planner_kwargs,
    )
