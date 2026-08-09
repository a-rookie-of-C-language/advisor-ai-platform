from __future__ import annotations

import logging

from agents.base.subagent import SubAgent
from agents.task_planner.task_planner_fallback import (
    build_fallback_plan,
    build_web_query,
    looks_like_education_query,
    looks_like_realtime_query,
)
from agents.task_planner.task_planner_llm_flow import (
    build_task_planner_prompt,
    plan_with_llm,
)
from agents.task_planner.task_planner_support import (
    prioritize_tools,
    render_task_plan_prompt,
)
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec
from tools.permissions.tool_permission import PermissionConfig, ToolPermission

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
        return await plan_with_llm(
            call_llm_json=self.call_llm_json,
            user_query=user_query,
            recent_messages=recent_messages,
            available_tools=available_tools,
            route_context=route_context,
            logger=logger,
        )

    def _build_plan_prompt(
        self,
        *,
        user_query: str,
        recent_messages: list[ChatMessage],
        available_tools: list[ToolSpec],
        route_context: JsonObject,
    ) -> str:
        return build_task_planner_prompt(
            user_query=user_query,
            recent_messages=recent_messages,
            available_tools=available_tools,
            route_context=route_context,
        )

    def _fallback_plan(
        self,
        *,
        user_query: str,
        available_tools: list[ToolSpec],
        route_context: JsonObject,
    ) -> JsonObject:
        return build_fallback_plan(
            user_query=user_query,
            available_tools=available_tools,
            route_context=route_context,
        )

    @staticmethod
    def render_plan_prompt(task_plan: JsonObject) -> str:
        return render_task_plan_prompt(task_plan)

    @staticmethod
    def prioritize_tools(tools: list[ToolSpec], task_plan: JsonObject | None) -> list[ToolSpec]:
        return prioritize_tools(tools, task_plan)

    @staticmethod
    def _looks_like_education_query(query: str) -> bool:
        return looks_like_education_query(query)

    @staticmethod
    def _looks_like_realtime_query(query: str) -> bool:
        return looks_like_realtime_query(query)

    @staticmethod
    def _build_web_query(query: str, route_categories: list[str]) -> str:
        return build_web_query(query, route_categories)
