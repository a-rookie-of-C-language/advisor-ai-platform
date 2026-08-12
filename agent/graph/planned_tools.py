from __future__ import annotations

import json
import logging

from agents.task_planner.TaskPlannerSubAgent import TaskPlannerSubAgent
from json_types import JsonObject
from llm.chat_message import ChatMessage
from safety.safety_pipeline import SafetyPipeline

from .runtime import _runtime
from .state import GraphState
from .tool_result_mapper import (
    build_tool_result_payload,
    filter_tool_result,
)

logger = logging.getLogger(__name__)


async def _emit(event: str, data: JsonObject) -> None:
    runtime = _runtime()
    queue = getattr(runtime, "queue", None)
    if queue is None:
        return
    await queue.put({"event": event, "data": data})


async def _execute_tool(*, tool_name: str, tool_args: JsonObject, state: GraphState) -> str:
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


def should_use_direct_plan(task_plan: JsonObject | None) -> bool:
    return (
        bool(task_plan) and isinstance(task_plan, dict) and str(task_plan.get("mode", "")).strip().lower() == "direct"
    )


def select_tools_for_plan(tools: list, task_plan: JsonObject | None) -> list:
    if not task_plan or not isinstance(task_plan, dict):
        return tools
    return TaskPlannerSubAgent.prioritize_tools(tools, task_plan)


def planned_tool_steps(task_plan: JsonObject | None) -> list[JsonObject]:
    if not task_plan or not isinstance(task_plan, dict):
        return []
    raw_steps = task_plan.get("steps", [])
    if not isinstance(raw_steps, list):
        return []
    steps: list[JsonObject] = []
    for raw_step in raw_steps:
        if not isinstance(raw_step, dict):
            continue
        if str(raw_step.get("action", "")).strip().lower() != "call_tool":
            continue
        tool_name = str(raw_step.get("tool_name", "")).strip()
        if not tool_name:
            continue
        arguments = raw_step.get("arguments", {})
        if not isinstance(arguments, dict):
            arguments = {}
        steps.append(
            {
                "tool_name": tool_name,
                "arguments": arguments,
                "reason": str(raw_step.get("reason", "")).strip(),
            }
        )
    return steps


def build_planned_tool_context(observations: list[JsonObject]) -> ChatMessage:
    return ChatMessage(
        role="system",
        content=(
            "A read-only tool explorer has gathered evidence for the current user question. "
            "以下是后端按任务计划顺序执行工具后得到的证据。"
            "请基于这些证据和当前对话回答；如果证据不足，请说明缺口。\n"
            f"{json.dumps(observations, ensure_ascii=False, default=str)[:6000]}"
        ),
    )


async def execute_planned_tool_steps(
    *,
    state: GraphState,
    task_plan: JsonObject | None,
    pipeline: SafetyPipeline | None,
) -> list[JsonObject]:
    runtime = _runtime()
    observations: list[JsonObject] = []
    for index, step in enumerate(planned_tool_steps(task_plan), start=1):
        tool_name = str(step.get("tool_name", "")).strip()
        tool = runtime.tools.get(tool_name)
        if tool is None:
            observations.append(
                {
                    "tool_name": tool_name,
                    "status": "error",
                    "message": "planned tool is not available",
                    "items": [],
                }
            )
            break
        arguments = step.get("arguments", {})
        if not isinstance(arguments, dict):
            arguments = {}
        tool_call_id = f"plan-{index}-{tool_name}"
        await _emit(
            "tool_use",
            {
                "tool_name": tool_name,
                "tool_call_id": tool_call_id,
                "input": arguments,
            },
        )
        raw_output = await _execute_tool(tool_name=tool_name, tool_args=arguments, state=state)
        try:
            payload = json.loads(raw_output) if raw_output else {}
        except Exception:
            logger.warning("planned tool output parse failed: tool=%s, output=%s", tool_name, raw_output[:200])
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
        status = str(payload.get("status", "error") or "error")
        base_payload = {
            "tool_name": tool_name,
            "tool_call_id": tool_call_id,
            "attempt": index,
            "status": status,
            "message": payload.get("message", "tool execute failed"),
        }
        ok = bool(payload.get("ok"))
        if ok:
            filtered_payload, _ = filter_tool_result(tool_name, payload, pipeline)
            await _emit(
                "tool_result",
                build_tool_result_payload(tool_name, base_payload, filtered_payload),
            )
            payload = filtered_payload
        else:
            await _emit(
                "tool_error",
                {
                    **base_payload,
                    "code": status,
                    "retryable": False,
                },
            )
        items = payload.get("items", [])
        if not isinstance(items, list):
            items = []
        observations.append(
            {
                "tool_name": tool_name,
                "status": status,
                "message": str(payload.get("message", "") or ""),
                "items": items,
            }
        )
        if not ok:
            break
    return observations
