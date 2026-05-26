from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable

from agents.task_planner.task_planner_support import (
    build_fallback_plan,
    build_plan_prompt_payload,
    normalize_plan,
)
from json_types import JsonObject
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec

CallLlmJson = Callable[..., Awaitable[JsonObject]]

_PLANNER_SYSTEM_PROMPT = """你是辅导员平台的任务规划器。你的任务不是直接回答问题，而是在执行前产出一份可执行计划。
规划原则：
- 涉及制度、政策、学生工作、辅导员理论、知识库内容时，优先考虑知识库检索，但这只是优先级，不是强制终止条件。
- 涉及课程、培训、最新资源、公开信息、时效性内容时，优先考虑 web_search。
- 混合问题通常先检索知识库，再用 web_search 补充最新信息。
- 如果 route_context 中存在 preferred_tools，请把它当作偏好工具，而不是必须覆盖其他工具。
- 如果不需要工具，直接给出 direct 计划。
- 计划要短、具体、可执行，不要编造工具名，也不要写空泛理由。
只返回严格 JSON，格式如下：
{
  "mode": "direct" | "plan_and_execute",
  "goal": "短目标",
  "summary": "可选概述",
  "stop_when": "短停止条件",
  "sufficient": false,
  "required_tools": ["rag_search", "web_search"],
  "steps": [
    {
      "action": "call_tool" | "final",
      "tool_name": "当 action 为 call_tool 时填写",
      "arguments": {},
      "reason": "为什么要做这一步",
      "expected_outcome": "希望得到什么",
      "sufficient": false,
      "summary": "仅 final 步需要"
    }
  ]
}
"""


async def plan_with_llm(
    *,
    call_llm_json: CallLlmJson,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    route_context: JsonObject,
    logger: logging.Logger,
) -> JsonObject:
    prompt = build_task_planner_prompt(
        user_query=user_query,
        recent_messages=recent_messages,
        available_tools=available_tools,
        route_context=route_context,
    )
    fallback_plan = lambda: build_fallback_plan(
        user_query=user_query,
        available_tools=available_tools,
        route_context=route_context,
    )
    try:
        raw = await call_llm_json(
            [
                {"role": "system", "content": _PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_retries=1,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("task_planner plan failed: %s", exc)
        return fallback_plan()
    return normalize_plan(
        raw,
        user_query=user_query,
        available_tools=available_tools,
        route_context=route_context,
        fallback_plan=fallback_plan,
    )


def build_task_planner_prompt(
    *,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    route_context: JsonObject,
) -> str:
    payload = build_plan_prompt_payload(
        user_query=user_query,
        recent_messages=recent_messages,
        available_tools=available_tools,
        route_context=route_context,
    )
    return json.dumps(payload, ensure_ascii=False, default=str)
