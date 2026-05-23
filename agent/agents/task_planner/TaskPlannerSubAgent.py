from __future__ import annotations

import json
import logging

from agents.base.subagent import SubAgent
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec
from tools.tool_permission import PermissionConfig, ToolPermission

logger = logging.getLogger(__name__)


class TaskPlannerSubAgent(SubAgent):
    """为辅导员平台生成 plan-and-execute 计划的规划器。"""

    MODEL_ENV_PREFIX = "TASK_PLANNER"
    DEFAULT_MODEL: str | None = None

    def __init__(self, llm_provider: BaseLLMProvider) -> None:
        super().__init__(
            name="task_planner_subagent",
            llm_provider=llm_provider,
            permission_config=PermissionConfig.from_allowed_tools(
                {ToolPermission.LLM},
                read_resources={"context", "memory"},
                write_resources=set(),
            ),
        )

    async def plan(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        route_context: JsonObject,
    ) -> JsonObject:
        prompt = self._build_plan_prompt(
            user_query=user_query,
            recent_messages=recent_messages,
            available_tools=available_tools,
            route_context=route_context,
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
            logger.warning("task_planner plan failed: %s", exc)
            return self._fallback_plan(
                user_query=user_query,
                available_tools=available_tools,
                route_context=route_context,
            )
        return self._normalize_plan(
            raw,
            user_query=user_query,
            available_tools=available_tools,
            route_context=route_context,
        )

    def _build_plan_prompt(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        route_context: JsonObject,
    ) -> str:
        payload = {
            "user_query": user_query,
            "recent_messages": self._compact_messages(recent_messages),
            "route_context": route_context,
            "available_tools": [self._tool_to_prompt_item(tool) for tool in available_tools],
        }
        return json.dumps(payload, ensure_ascii=False, default=str)

    def _normalize_plan(
        self,
        payload: JsonObject,
        *,
        user_query: str,
        available_tools: list[ToolSpec],
        route_context: JsonObject,
    ) -> JsonObject:
        if not isinstance(payload, dict):
            return self._fallback_plan(
                user_query=user_query,
                available_tools=available_tools,
                route_context=route_context,
            )

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
            return self._fallback_plan(
                user_query=user_query,
                available_tools=available_tools,
                route_context=route_context,
            )

        required_tools = [
            name
            for name in self._coerce_names(payload.get("required_tools", []))
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

    def _fallback_plan(
        self,
        *,
        user_query: str,
        available_tools: list[ToolSpec],
        route_context: JsonObject,
    ) -> JsonObject:
        tool_names = {tool.name for tool in available_tools}
        route_categories = self._coerce_names(route_context.get("categories", []))
        matched_tools = self._coerce_names(route_context.get("matched_tools", []))
        preferred_tools = self._coerce_names(route_context.get("preferred_tools", []))
        normalized_query = user_query.strip()
        steps: list[JsonObject] = []

        rag_needed = "rag_search" in tool_names and (
            "retrieval" in route_categories
            or "rag_search" in preferred_tools
            or self._looks_like_education_query(normalized_query)
            or any(name == "rag_search" for name in matched_tools)
        )
        web_needed = "web_search" in tool_names and (
            "search" in route_categories
            or self._looks_like_realtime_query(normalized_query)
        )

        if rag_needed:
            steps.append(
                {
                    "action": "call_tool",
                    "tool_name": "rag_search",
                    "arguments": {"query": normalized_query, "top_k": 5},
                    "reason": "先检索知识库，补足辅导员工作相关的制度、理论和场景背景",
                    "expected_outcome": "得到可用于回答的制度依据、概念解释或本地知识片段",
                    "sufficient": False,
                }
            )

        if web_needed:
            web_query = self._build_web_query(normalized_query, route_categories)
            if web_query:
                steps.append(
                    {
                        "action": "call_tool",
                        "tool_name": "web_search",
                        "arguments": {"query": web_query, "max_results": 5},
                        "reason": "补充最新课程、培训、公开资源或外部信息",
                        "expected_outcome": "得到最新公开信息或可引用的外部资源",
                        "sufficient": False,
                    }
                )

        if not steps:
            return {
                "mode": "direct",
                "goal": normalized_query or "回答用户问题",
                "summary": "当前问题不需要额外工具，直接生成回答。",
                "stop_when": "可以直接回答用户问题",
                "sufficient": True,
                "required_tools": [],
                "steps": [
                    {
                        "action": "final",
                        "reason": "当前问题无需工具",
                        "summary": "",
                        "sufficient": True,
                    }
                ],
                "route_context": route_context,
                "source": "fallback",
            }

        required_tools = list(
            dict.fromkeys(matched_tools + [str(step["tool_name"]) for step in steps if step.get("tool_name")])
        )
        return {
            "mode": "plan_and_execute",
            "goal": normalized_query or "回答用户问题",
            "summary": "先检索再回答",
            "stop_when": "已收集到足够证据并能直接回答用户问题",
            "sufficient": False,
            "required_tools": required_tools,
            "steps": steps,
            "route_context": route_context,
            "source": "fallback",
        }

    @staticmethod
    def render_plan_prompt(task_plan: JsonObject) -> str:
        return (
            "下面是本轮执行计划，请严格遵循计划中的步骤和工具顺序。"
            "如果计划已经收集到足够证据，就直接基于证据回答；"
            "如果计划要求继续补充，再继续按 ReAct 方式调用工具。\n"
            f"{json.dumps(task_plan, ensure_ascii=False, default=str)}"
        )

    @staticmethod
    def prioritize_tools(tools: list[ToolSpec], task_plan: JsonObject | None) -> list[ToolSpec]:
        if not task_plan or not isinstance(task_plan, dict):
            return tools

        required_names = TaskPlannerSubAgent._coerce_names(task_plan.get("required_tools", []))
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

    @staticmethod
    def _looks_like_education_query(query: str) -> bool:
        normalized = query.strip().lower()
        if not normalized:
            return False
        keywords = (
            "辅导员",
            "学生",
            "班主任",
            "学校",
            "学院",
            "规章",
            "制度",
            "政策",
            "教育",
            "课程",
            "培训",
            "培养",
            "核心素养",
        )
        return any(keyword in normalized for keyword in keywords)

    @staticmethod
    def _looks_like_realtime_query(query: str) -> bool:
        normalized = query.strip().lower()
        if not normalized:
            return False
        keywords = (
            "最新",
            "今天",
            "现在",
            "近期",
            "课程",
            "培训",
            "公开",
            "资源",
            "通知",
            "官网",
            "新闻",
            "日期",
            "星期",
        )
        return any(keyword in normalized for keyword in keywords)

    @staticmethod
    def _coerce_names(value: object) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    @staticmethod
    def _build_web_query(query: str, route_categories: list[str]) -> str:
        normalized = query.strip()
        if not normalized:
            return ""
        if "search" in route_categories:
            return normalized
        return normalized

    @staticmethod
    def _tool_to_prompt_item(tool: ToolSpec) -> JsonObject:
        return {
            "name": tool.name,
            "description": (tool.description or "")[:800],
            "category": getattr(tool, "category", ""),
            "read_only": bool(getattr(tool, "is_read_only", False)),
            "defer_loading": bool(getattr(tool, "defer_loading", False)),
        }

    @staticmethod
    def _compact_messages(messages: list[ChatMessage]) -> list[JsonObject]:
        compacted: list[JsonObject] = []
        for message in messages[-8:]:
            compacted.append(
                {
                    "role": message.role,
                    "content": (message.content or "")[:1200],
                }
            )
        return compacted


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
