from __future__ import annotations

import logging
from typing import Awaitable, Callable

from agents.base.subagent import SubAgent
from agents.tool_explorer.tool_explorer_events import (
    build_rejected_tool_event,
)
from agents.tool_explorer.tool_explorer_llm_flow import (
    build_tool_explorer_plan_prompt,
    plan_tool_step,
    summarize_observations,
)
from agents.tool_explorer.tool_explorer_step_runner import run_tool_step
from agents.tool_explorer.tool_explorer_step_selection import select_next_tool_explorer_step
from agents.tool_explorer.tool_explorer_support import (
    dedupe_tools,
    resolve_max_steps,
)
from agents.tool_explorer.ToolExplorerEvent import ToolExplorerEvent
from agents.tool_explorer.ToolExplorerOutcome import ToolExplorerOutcome
from agents.tool_explorer.ToolExplorerStep import ToolExplorerStep
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec
from tools.tool_permission import PermissionConfig, ToolPermission

logger = logging.getLogger(__name__)

ToolExecutor = Callable[[str, JsonObject], Awaitable[str]]


class ToolExplorerSubAgent(SubAgent):
    """Read-only ReAct-style subagent that explores tools and returns compact evidence."""

    MODEL_ENV_PREFIX = "TOOL_EXPLORER"
    DEFAULT_MODEL: str | None = None

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        *,
        max_steps: int = 2,
        max_evidence_chars: int = 8000,
    ) -> None:
        super().__init__(
            name="tool_explorer_subagent",
            llm_provider=llm_provider,
            permission_config=PermissionConfig.from_allowed_tools(
                {ToolPermission.LLM, ToolPermission.RAG_READ, ToolPermission.MEMORY_READ, ToolPermission.SEARCH},
                read_resources={"context", "memory"},
                write_resources=set(),
            ),
        )
        self._max_steps = max(1, max_steps)
        self._max_evidence_chars = max(1000, max_evidence_chars)

    async def explore(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        candidate_tools: list[ToolSpec],
        initial_route: JsonObject,
        tool_executor: ToolExecutor,
        task_plan: JsonObject | None = None,
    ) -> ToolExplorerOutcome:
        read_only_tools = dedupe_tools(
            [tool for tool in available_tools if tool.is_read_only]
        )
        if not read_only_tools:
            return ToolExplorerOutcome(used=False, sufficient=False)

        candidate_names = {tool.name for tool in candidate_tools if tool.is_read_only}
        events: list[ToolExplorerEvent] = []
        evidence: list[JsonObject] = []
        tool_calls: list[JsonObject] = []
        observations: list[JsonObject] = []

        max_steps = resolve_max_steps(task_plan, self._max_steps)
        for step_index in range(1, max_steps + 1):
            step = await select_next_tool_explorer_step(
                user_query=user_query,
                recent_messages=recent_messages,
                available_tools=read_only_tools,
                candidate_names=candidate_names,
                initial_route=initial_route,
                task_plan=task_plan,
                observations=observations,
                plan_step=self._plan_step,
            )

            if step.action == "final" or step.sufficient:
                return ToolExplorerOutcome(
                    used=bool(tool_calls),
                    sufficient=bool(step.sufficient),
                    summary=step.summary,
                    evidence=evidence,
                    events=events,
                    tool_calls=tool_calls,
                )

            if step.action != "call_tool" or not step.tool_name:
                return ToolExplorerOutcome(
                    used=bool(tool_calls),
                    sufficient=False,
                    summary=step.summary,
                    evidence=evidence,
                    events=events,
                    tool_calls=tool_calls,
                )

            allowed_names = {tool.name for tool in read_only_tools}
            if step.tool_name not in allowed_names:
                events.append(build_rejected_tool_event(step_index, step))
                return ToolExplorerOutcome(
                    used=bool(tool_calls),
                    sufficient=False,
                    summary="tool explorer selected a disallowed tool",
                    evidence=evidence,
                    events=events,
                    tool_calls=tool_calls,
                )

            step_events, call_record, observation = await run_tool_step(
                step=step,
                step_index=step_index,
                tool_executor=tool_executor,
                max_evidence_chars=self._max_evidence_chars,
            )
            events.extend(step_events)
            tool_calls.append(call_record)
            observations.append(observation)
            evidence.append(observation)

        summary = await self._summarize(
            user_query=user_query,
            recent_messages=recent_messages,
            observations=observations,
        )
        return ToolExplorerOutcome(
            used=bool(tool_calls),
            sufficient=bool(summary),
            summary=summary,
            evidence=evidence,
            events=events,
            tool_calls=tool_calls,
        )

    async def _plan_step(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        candidate_names: set[str],
        initial_route: JsonObject,
        task_plan: JsonObject | None,
        observations: list[JsonObject],
    ) -> ToolExplorerStep:
        return await plan_tool_step(
            call_llm_json=self.call_llm_json,
            user_query=user_query,
            recent_messages=recent_messages,
            available_tools=available_tools,
            candidate_names=candidate_names,
            initial_route=initial_route,
            task_plan=task_plan,
            observations=observations,
            logger=logger,
        )

    async def _summarize(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        observations: list[JsonObject],
    ) -> str:
        return await summarize_observations(
            call_llm_json=self.call_llm_json,
            user_query=user_query,
            recent_messages=recent_messages,
            observations=observations,
            logger=logger,
        )

    def _build_plan_prompt(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        candidate_names: set[str],
        initial_route: JsonObject,
        task_plan: JsonObject | None,
        observations: list[JsonObject],
    ) -> str:
        return build_tool_explorer_plan_prompt(
            user_query=user_query,
            recent_messages=recent_messages,
            available_tools=available_tools,
            candidate_names=candidate_names,
            initial_route=initial_route,
            task_plan=task_plan,
            observations=observations,
        )

    async def run_once(self) -> JsonObject:
        return {}

    async def run(self) -> None:
        return None
