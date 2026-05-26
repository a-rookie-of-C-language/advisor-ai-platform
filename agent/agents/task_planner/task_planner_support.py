from __future__ import annotations

import json
from collections.abc import Callable

from agents.task_planner.task_planner_fallback import (
    build_fallback_plan,
    build_web_query,
    looks_like_education_query,
    looks_like_realtime_query,
)
from agents.task_planner.task_planner_name_utils import coerce_names
from json_types import JsonObject
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec


def build_plan_prompt_payload(
    *,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    route_context: JsonObject,
) -> JsonObject:
    return {
        "user_query": user_query,
        "recent_messages": compact_messages(recent_messages),
        "route_context": route_context,
        "available_tools": [tool_to_prompt_item(tool) for tool in available_tools],
    }


def normalize_plan(
    payload: JsonObject,
    *,
    user_query: str,
    available_tools: list[ToolSpec],
    route_context: JsonObject,
    fallback_plan: Callable[[], JsonObject],
) -> JsonObject:
    if not isinstance(payload, dict):
        return fallback_plan()

    mode = str(payload.get("mode", "plan_and_execute")).strip().lower()
    if mode not in {"direct", "plan_and_execute"}:
        mode = "plan_and_execute"

    goal = str(payload.get("goal", "")).strip() or user_query
    summary = str(payload.get("summary", "")).strip()
    stop_when = str(payload.get("stop_when", "")).strip()
    sufficient = bool(payload.get("sufficient", False))

    allowed_tools = {tool.name for tool in available_tools}
    steps: list[JsonObject] = []
    raw_steps = payload.get("steps", [])
    if isinstance(raw_steps, list):
        for raw_step in raw_steps:
            if not isinstance(raw_step, dict):
                continue
            action = str(raw_step.get("action", "")).strip().lower()
            if action not in {"call_tool", "final"}:
                continue
            tool_name = str(raw_step.get("tool_name", "")).strip()
            if action == "call_tool" and tool_name not in allowed_tools:
                continue
            arguments = raw_step.get("arguments", {})
            if not isinstance(arguments, dict):
                arguments = {}
            step: JsonObject = {
                "action": action,
                "tool_name": tool_name,
                "arguments": arguments,
                "reason": str(raw_step.get("reason", "")).strip(),
                "expected_outcome": str(raw_step.get("expected_outcome", "")).strip(),
                "sufficient": bool(raw_step.get("sufficient", False)),
            }
            if action == "final":
                step["summary"] = str(raw_step.get("summary", "")).strip()
            steps.append(step)

    if not steps:
        return fallback_plan()

    required_tools = [
        name
        for name in coerce_names(payload.get("required_tools", []))
        if name in allowed_tools
    ]
    return {
        "mode": mode,
        "goal": goal,
        "summary": summary,
        "stop_when": stop_when,
        "sufficient": sufficient,
        "required_tools": required_tools,
        "steps": steps,
        "route_context": route_context,
        "source": "planner",
    }


def prioritize_tools(tools: list[ToolSpec], task_plan: JsonObject | None) -> list[ToolSpec]:
    if not task_plan or not isinstance(task_plan, dict):
        return tools

    required_names = coerce_names(task_plan.get("required_tools", []))
    if not required_names:
        return tools

    required_map = {tool.name: tool for tool in tools}
    prioritized = [required_map[name] for name in required_names if name in required_map]
    if len(prioritized) == len(tools):
        return prioritized

    seen = {tool.name for tool in prioritized}
    for tool in tools:
        if tool.name not in seen:
            prioritized.append(tool)
    return prioritized


def render_task_plan_prompt(task_plan: JsonObject) -> str:
    return (
        "下面是本轮执行计划，请严格遵循计划中的步骤和工具顺序。"
        "如果计划已经收集到足够证据，就直接基于证据回答；"
        "如果计划要求继续补充，再继续按 ReAct 方式调用工具。\n"
        f"{json.dumps(task_plan, ensure_ascii=False, default=str)}"
    )


def tool_to_prompt_item(tool: ToolSpec) -> JsonObject:
    return {
        "name": tool.name,
        "description": (tool.description or "")[:800],
        "category": getattr(tool, "category", ""),
        "read_only": bool(getattr(tool, "is_read_only", False)),
        "defer_loading": bool(getattr(tool, "defer_loading", False)),
    }


def compact_messages(messages: list[ChatMessage]) -> list[JsonObject]:
    compacted: list[JsonObject] = []
    for message in messages[-8:]:
        compacted.append(
            {
                "role": message.role,
                "content": (message.content or "")[:1200],
            }
        )
    return compacted
