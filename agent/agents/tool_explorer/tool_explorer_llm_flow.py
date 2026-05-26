from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable

from agents.tool_explorer.ToolExplorerStep import ToolExplorerStep
from agents.tool_explorer.tool_explorer_support import (
    build_plan_prompt_payload,
    build_summary_prompt_payload,
    coerce_step,
    fallback_summary,
)
from json_types import JsonObject
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec

CallLlmJson = Callable[..., Awaitable[JsonObject]]

_PLANNER_SYSTEM_PROMPT = """You are a read-only tool explorer subagent.
Your job is to decide one next tool call, or finish if observations are enough.
Use conversation context to resolve follow-up questions such as "具体是哪些?".
Only use tools from available_tools. Prefer candidate_tool_names when relevant.
Return strict JSON only:
{
  "action": "call_tool" | "final" | "none",
  "tool_name": "tool name when action is call_tool",
  "arguments": {},
  "reason": "short reason",
  "sufficient": false,
  "summary": "short evidence summary when sufficient"
}
Do not invent data. If a tool result is needed to answer, choose call_tool."""

_SUMMARY_SYSTEM_PROMPT = """You summarize tool observations for the main agent.
Return strict JSON only:
{
  "summary": "facts from observations that answer or help answer the user query"
}
Do not add facts not present in observations."""


async def plan_tool_step(
    *,
    call_llm_json: CallLlmJson,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    candidate_names: set[str],
    initial_route: JsonObject,
    task_plan: JsonObject | None,
    observations: list[JsonObject],
    logger: logging.Logger,
) -> ToolExplorerStep:
    prompt = build_tool_explorer_plan_prompt(
        user_query=user_query,
        recent_messages=recent_messages,
        available_tools=available_tools,
        candidate_names=candidate_names,
        initial_route=initial_route,
        task_plan=task_plan,
        observations=observations,
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
        logger.warning("tool_explorer plan failed: %s", exc)
        return ToolExplorerStep(action="none", reason=str(exc))
    return coerce_step(raw)


async def summarize_observations(
    *,
    call_llm_json: CallLlmJson,
    user_query: str,
    recent_messages: list[ChatMessage],
    observations: list[JsonObject],
    logger: logging.Logger,
) -> str:
    if not observations:
        return ""
    payload = build_summary_prompt_payload(
        user_query=user_query,
        recent_messages=recent_messages,
        observations=observations,
    )
    try:
        raw = await call_llm_json(
            [
                {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            max_retries=1,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("tool_explorer summarize failed: %s", exc)
        return fallback_summary(observations)
    summary = str(raw.get("summary", "")).strip()
    return summary or fallback_summary(observations)


def build_tool_explorer_plan_prompt(
    *,
    user_query: str,
    recent_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    candidate_names: set[str],
    initial_route: JsonObject,
    task_plan: JsonObject | None,
    observations: list[JsonObject],
) -> str:
    payload = build_plan_prompt_payload(
        user_query=user_query,
        recent_messages=recent_messages,
        available_tools=available_tools,
        candidate_names=candidate_names,
        initial_route=initial_route,
        task_plan=task_plan,
        observations=observations,
    )
    return json.dumps(payload, ensure_ascii=False)
