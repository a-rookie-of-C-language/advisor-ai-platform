from __future__ import annotations

from agents.tool_explorer.ToolExplorerEvent import ToolExplorerEvent
from agents.tool_explorer.ToolExplorerStep import ToolExplorerStep
from agents.tool_explorer.tool_explorer_support import compact_items as compact_tool_items
from json_types import JsonObject, JsonValue


def build_rejected_tool_event(step_index: int, step: ToolExplorerStep) -> ToolExplorerEvent:
    return ToolExplorerEvent(
        event="sys_tool_plan",
        payload={
            "step": step_index,
            "action": "rejected",
            "tool_name": step.tool_name,
            "reason": "tool_not_allowed",
        },
    )


def build_tool_plan_event(step_index: int, step: ToolExplorerStep, tool_call_id: str) -> ToolExplorerEvent:
    return ToolExplorerEvent(
        event="sys_tool_plan",
        payload={
            "step": step_index,
            "action": "call_tool",
            "tool_name": step.tool_name,
            "tool_call_id": tool_call_id,
            "arguments": step.arguments,
            "reason": step.reason,
        },
    )


def build_tool_use_event(step: ToolExplorerStep, tool_call_id: str) -> ToolExplorerEvent:
    return ToolExplorerEvent(
        event="tool_use",
        payload={
            "tool_name": step.tool_name,
            "tool_call_id": tool_call_id,
            "input": step.arguments,
        },
    )


def build_tool_result_event(
    *,
    step: ToolExplorerStep,
    step_index: int,
    tool_call_id: str,
    status: str,
    message: str,
    ok: bool,
    items: list[JsonValue],
    payload: JsonObject,
) -> ToolExplorerEvent:
    return ToolExplorerEvent(
        event="tool_result" if ok else "tool_error",
        payload={
            "tool_name": step.tool_name,
            "tool_call_id": tool_call_id,
            "attempt": step_index,
            "status": status,
            "message": message or ("tool execute success" if ok else "tool execute failed"),
            "items": items,
            "output": payload,
        },
    )


def build_tool_call_record(step: ToolExplorerStep, *, status: str, message: str) -> JsonObject:
    return {
        "tool_name": step.tool_name,
        "arguments": step.arguments,
        "status": status,
        "message": message,
    }


def build_tool_observation(
    step: ToolExplorerStep,
    *,
    status: str,
    message: str,
    items: list[JsonValue],
    max_evidence_chars: int,
) -> JsonObject:
    return {
        "tool_name": step.tool_name,
        "status": status,
        "message": message,
        "items": compact_tool_items(items, max_evidence_chars),
    }
