from __future__ import annotations

from collections.abc import Awaitable, Callable

from agents.tool_explorer.ToolExplorerEvent import ToolExplorerEvent
from agents.tool_explorer.ToolExplorerStep import ToolExplorerStep
from agents.tool_explorer.tool_explorer_events import (
    build_tool_call_record,
    build_tool_observation,
    build_tool_plan_event,
    build_tool_result_event,
    build_tool_use_event,
)
from agents.tool_explorer.tool_explorer_support import parse_tool_execution
from json_types import JsonObject

ToolExecutor = Callable[[str, JsonObject], Awaitable[str]]


async def run_tool_step(
    *,
    step: ToolExplorerStep,
    step_index: int,
    tool_executor: ToolExecutor,
    max_evidence_chars: int,
) -> tuple[list[ToolExplorerEvent], JsonObject, JsonObject]:
    tool_call_id = f"tool_explorer-{step_index}-{step.tool_name}"
    events = [
        build_tool_plan_event(step_index, step, tool_call_id),
        build_tool_use_event(step, tool_call_id),
    ]

    raw_output = await tool_executor(step.tool_name, step.arguments)
    payload, ok, status, message, items = parse_tool_execution(raw_output)

    events.append(
        build_tool_result_event(
            step=step,
            step_index=step_index,
            tool_call_id=tool_call_id,
            status=status,
            message=message,
            ok=ok,
            items=items,
            payload=payload,
        )
    )

    call_record = build_tool_call_record(step, status=status, message=message)
    observation = build_tool_observation(
        step,
        status=status,
        message=message,
        items=items,
        max_evidence_chars=max_evidence_chars,
    )
    return events, call_record, observation
