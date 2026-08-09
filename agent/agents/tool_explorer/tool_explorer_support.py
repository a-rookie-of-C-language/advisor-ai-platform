from __future__ import annotations

import json

from agents.task_planner.task_planner_support import render_task_plan_prompt
from agents.tool_explorer.ToolExplorerStep import ToolExplorerStep
from json_types import JsonObject, JsonValue
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec


def planned_step(
    *,
    task_plan: JsonObject | None,
    available_tools: list[ToolSpec],
    observations: list[JsonObject],
) -> ToolExplorerStep | None:
    if not task_plan or not isinstance(task_plan, dict):
        return None
    raw_steps = task_plan.get("steps", [])
    if not isinstance(raw_steps, list) or not raw_steps:
        return None

    allowed_names = {tool.name for tool in available_tools}
    executed_names = {
        str(item.get("tool_name", "")).strip()
        for item in observations
        if isinstance(item, dict) and str(item.get("tool_name", "")).strip()
    }

    for raw_step in raw_steps:
        if not isinstance(raw_step, dict):
            continue
        action = str(raw_step.get("action", "")).strip().lower()
        if action == "final":
            return ToolExplorerStep(
                action="final",
                reason=str(raw_step.get("reason", "")).strip(),
                sufficient=bool(raw_step.get("sufficient", True)),
                summary=str(raw_step.get("summary", "")).strip(),
            )
        if action != "call_tool":
            continue
        tool_name = str(raw_step.get("tool_name", "")).strip()
        if not tool_name or tool_name not in allowed_names or tool_name in executed_names:
            continue
        arguments = raw_step.get("arguments", {})
        if not isinstance(arguments, dict):
            arguments = {}
        return ToolExplorerStep(
            action="call_tool",
            tool_name=tool_name,
            arguments=arguments,
            reason=str(raw_step.get("reason", "")).strip(),
            sufficient=bool(raw_step.get("sufficient", False)),
        )

    return None


def resolve_max_steps(task_plan: JsonObject | None, default_max_steps: int) -> int:
    if not task_plan or not isinstance(task_plan, dict):
        return default_max_steps
    raw_steps = task_plan.get("steps", [])
    if not isinstance(raw_steps, list):
        return default_max_steps
    call_tool_count = sum(
        1
        for raw_step in raw_steps
        if isinstance(raw_step, dict)
        and str(raw_step.get("action", "")).strip().lower() == "call_tool"
    )
    return max(default_max_steps, call_tool_count + 1)


def coerce_step(payload: JsonObject) -> ToolExplorerStep:
    action = str(payload.get("action", "")).strip().lower()
    if action not in {"call_tool", "final", "none"}:
        action = "none"
    arguments = payload.get("arguments", {})
    if not isinstance(arguments, dict):
        arguments = {}
    return ToolExplorerStep(
        action=action,
        tool_name=str(payload.get("tool_name", "")).strip(),
        arguments=arguments,
        reason=str(payload.get("reason", "")).strip(),
        sufficient=bool(payload.get("sufficient", action == "final")),
        summary=str(payload.get("summary", "")).strip(),
    )


def contextual_followup_step(
    *,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    observations: list[JsonObject],
) -> ToolExplorerStep | None:
    if observations:
        return None
    normalized = user_query.strip().lower()
    if not normalized:
        return None
    followup_hints = ("具体", "哪些", "名单", "列表", "列出", "都有谁", "是谁")
    if not any(hint in normalized for hint in followup_hints):
        return None
    recent_text = "\n".join((message.content or "") for message in recent_messages[-6:]).lower()
    if "学生" not in recent_text:
        return None
    for tool in available_tools:
        if tool.name == "list_students" or tool.name.endswith("__list_students"):
            return ToolExplorerStep(
                action="call_tool",
                tool_name=tool.name,
                arguments={},
                reason="用户在追问上一轮提到的学生具体名单",
                sufficient=False,
            )
    return None


def parse_tool_output(raw_output: str) -> JsonObject:
    try:
        parsed = json.loads(raw_output) if raw_output else {}
    except Exception:
        parsed = {}
    if isinstance(parsed, dict):
        return parsed
    return {}


def parse_tool_execution(raw_output: str) -> tuple[JsonObject, bool, str, str, list[JsonValue]]:
    payload = parse_tool_output(raw_output)
    ok = bool(payload.get("ok"))
    status = str(payload.get("status", "success" if ok else "error"))
    message = str(payload.get("message", ""))
    items = payload.get("items", [])
    if not isinstance(items, list):
        items = []
    return payload, ok, status, message, items


def compact_items(items: list[JsonValue], max_evidence_chars: int) -> list[JsonValue]:
    raw = json.dumps(items, ensure_ascii=False, default=str)
    if len(raw) <= max_evidence_chars:
        return items
    return [{"truncated": True, "text": raw[:max_evidence_chars]}]


def compact_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
    compacted: list[dict[str, str]] = []
    for message in messages[-8:]:
        compacted.append(
            {
                "role": message.role,
                "content": (message.content or "")[:1200],
            }
        )
    return compacted


def tool_to_prompt_item(tool: ToolSpec) -> JsonObject:
    return {
        "name": tool.name,
        "description": (tool.description or "")[:800],
        "parameters": tool.parameters,
    }


def build_plan_prompt_payload(
    *,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    candidate_names: set[str],
    initial_route: JsonObject,
    task_plan: JsonObject | None,
    observations: list[JsonObject],
) -> JsonObject:
    return {
        "user_query": user_query,
        "recent_messages": compact_messages(recent_messages),
        "initial_route": initial_route,
        "task_plan": task_plan or {},
        "task_plan_prompt": render_task_plan_prompt(task_plan) if task_plan else "",
        "candidate_tool_names": sorted(candidate_names),
        "available_tools": [tool_to_prompt_item(tool) for tool in available_tools],
        "observations": observations,
    }


def build_summary_prompt_payload(
    *,
    user_query: str,
    recent_messages: list[ChatMessage],
    observations: list[JsonObject],
) -> JsonObject:
    return {
        "user_query": user_query,
        "recent_messages": compact_messages(recent_messages),
        "observations": observations,
    }


def dedupe_tools(tools: list[ToolSpec]) -> list[ToolSpec]:
    seen: set[str] = set()
    result: list[ToolSpec] = []
    for tool in tools:
        if tool.name in seen:
            continue
        seen.add(tool.name)
        result.append(tool)
    return result


def fallback_summary(observations: list[JsonObject]) -> str:
    return json.dumps({"observations": observations}, ensure_ascii=False, default=str)[:4000]
