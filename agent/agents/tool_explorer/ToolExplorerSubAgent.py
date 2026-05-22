from __future__ import annotations

import json
import logging
from typing import Any, Awaitable, Callable

from agents.base.subagent import SubAgent
from agents.tool_explorer.ToolExplorerEvent import ToolExplorerEvent
from agents.tool_explorer.ToolExplorerOutcome import ToolExplorerOutcome
from agents.tool_explorer.ToolExplorerStep import ToolExplorerStep
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec
from tools.tool_permission import PermissionConfig, ToolPermission

logger = logging.getLogger(__name__)

ToolExecutor = Callable[[str, dict[str, Any]], Awaitable[str]]


class ToolExplorerSubAgent(SubAgent):
    """Read-only ReAct-style subagent that explores tools and returns compact evidence."""

    MODEL_ENV_PREFIX = "TOOL_EXPLORER"

    def __init__(
        self,
        llm_provider: Any,
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
        initial_route: dict[str, Any],
        tool_executor: ToolExecutor,
    ) -> ToolExplorerOutcome:
        read_only_tools = self._dedupe_tools(
            [tool for tool in available_tools if tool.is_read_only]
        )
        if not read_only_tools:
            return ToolExplorerOutcome(used=False, sufficient=False)

        candidate_names = {tool.name for tool in candidate_tools if tool.is_read_only}
        events: list[ToolExplorerEvent] = []
        evidence: list[dict[str, Any]] = []
        tool_calls: list[dict[str, Any]] = []
        observations: list[dict[str, Any]] = []

        for step_index in range(1, self._max_steps + 1):
            step = self._contextual_followup_step(
                user_query=user_query,
                recent_messages=recent_messages,
                available_tools=read_only_tools,
                observations=observations,
            )
            if step is None:
                step = await self._plan_step(
                    user_query=user_query,
                    recent_messages=recent_messages,
                    available_tools=read_only_tools,
                    candidate_names=candidate_names,
                    initial_route=initial_route,
                    observations=observations,
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
                events.append(
                    ToolExplorerEvent(
                        event="sys_tool_plan",
                        payload={
                            "step": step_index,
                            "action": "rejected",
                            "tool_name": step.tool_name,
                            "reason": "tool_not_allowed",
                        },
                    )
                )
                return ToolExplorerOutcome(
                    used=bool(tool_calls),
                    sufficient=False,
                    summary="tool explorer selected a disallowed tool",
                    evidence=evidence,
                    events=events,
                    tool_calls=tool_calls,
                )

            tool_call_id = f"tool_explorer-{step_index}-{step.tool_name}"
            events.append(
                ToolExplorerEvent(
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
            )
            events.append(
                ToolExplorerEvent(
                    event="tool_use",
                    payload={
                        "tool_name": step.tool_name,
                        "tool_call_id": tool_call_id,
                        "input": step.arguments,
                    },
                )
            )

            raw_output = await tool_executor(step.tool_name, step.arguments)
            payload = self._parse_tool_output(raw_output)
            ok = bool(payload.get("ok"))
            status = str(payload.get("status", "success" if ok else "error"))
            message = str(payload.get("message", ""))
            items = payload.get("items", [])
            if not isinstance(items, list):
                items = []

            base_payload = {
                "tool_name": step.tool_name,
                "tool_call_id": tool_call_id,
                "attempt": step_index,
                "status": status,
                "message": message or ("tool execute success" if ok else "tool execute failed"),
                "items": items,
                "output": payload,
            }
            events.append(
                ToolExplorerEvent(
                    event="tool_result" if ok else "tool_error",
                    payload=base_payload,
                )
            )

            call_record = {
                "tool_name": step.tool_name,
                "arguments": step.arguments,
                "status": status,
                "message": message,
            }
            tool_calls.append(call_record)
            observation = {
                "tool_name": step.tool_name,
                "status": status,
                "message": message,
                "items": self._compact_items(items),
            }
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
        initial_route: dict[str, Any],
        observations: list[dict[str, Any]],
    ) -> ToolExplorerStep:
        prompt = self._build_plan_prompt(
            user_query=user_query,
            recent_messages=recent_messages,
            available_tools=available_tools,
            candidate_names=candidate_names,
            initial_route=initial_route,
            observations=observations,
        )
        try:
            raw = await self.call_llm_json(
                [
                    {"role": "system", "content": _PLANNER_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_retries=1,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("tool_explorer plan failed: %s", exc)
            return ToolExplorerStep(action="none", reason=str(exc))
        return self._coerce_step(raw)

    async def _summarize(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        observations: list[dict[str, Any]],
    ) -> str:
        if not observations:
            return ""
        payload = {
            "user_query": user_query,
            "recent_messages": self._compact_messages(recent_messages),
            "observations": observations,
        }
        try:
            raw = await self.call_llm_json(
                [
                    {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
                max_retries=1,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("tool_explorer summarize failed: %s", exc)
            return self._fallback_summary(observations)
        summary = str(raw.get("summary", "")).strip()
        return summary or self._fallback_summary(observations)

    def _build_plan_prompt(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        candidate_names: set[str],
        initial_route: dict[str, Any],
        observations: list[dict[str, Any]],
    ) -> str:
        payload = {
            "user_query": user_query,
            "recent_messages": self._compact_messages(recent_messages),
            "initial_route": initial_route,
            "candidate_tool_names": sorted(candidate_names),
            "available_tools": [self._tool_to_prompt_item(tool) for tool in available_tools],
            "observations": observations,
        }
        return json.dumps(payload, ensure_ascii=False)

    @staticmethod
    def _coerce_step(payload: dict[str, Any]) -> ToolExplorerStep:
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

    @staticmethod
    def _contextual_followup_step(
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        observations: list[dict[str, Any]],
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

    @staticmethod
    def _parse_tool_output(raw_output: str) -> dict[str, Any]:
        try:
            parsed = json.loads(raw_output) if raw_output else {}
        except Exception:
            parsed = {}
        if isinstance(parsed, dict):
            return parsed
        return {}

    def _compact_items(self, items: list[Any]) -> list[Any]:
        raw = json.dumps(items, ensure_ascii=False, default=str)
        if len(raw) <= self._max_evidence_chars:
            return items
        return [{"truncated": True, "text": raw[: self._max_evidence_chars]}]

    @staticmethod
    def _compact_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
        compacted: list[dict[str, str]] = []
        for message in messages[-8:]:
            compacted.append(
                {
                    "role": message.role,
                    "content": (message.content or "")[:1200],
                }
            )
        return compacted

    @staticmethod
    def _tool_to_prompt_item(tool: ToolSpec) -> dict[str, Any]:
        return {
            "name": tool.name,
            "description": (tool.description or "")[:800],
            "parameters": tool.parameters,
        }

    @staticmethod
    def _dedupe_tools(tools: list[ToolSpec]) -> list[ToolSpec]:
        seen: set[str] = set()
        result: list[ToolSpec] = []
        for tool in tools:
            if tool.name in seen:
                continue
            seen.add(tool.name)
            result.append(tool)
        return result

    @staticmethod
    def _fallback_summary(observations: list[dict[str, Any]]) -> str:
        return json.dumps({"observations": observations}, ensure_ascii=False, default=str)[:4000]

    async def run_once(self) -> dict[str, Any]:
        return {}

    async def run(self) -> None:
        return None


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
