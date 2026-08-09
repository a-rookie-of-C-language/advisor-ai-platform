from __future__ import annotations

from typing import Any

from json_types import JsonObject

from .helpers import _prefer_rag_only
from .planned_tools import select_tools_for_plan
from .state import GraphState


def select_generation_tools(
    *,
    runtime: Any,
    state: GraphState,
    task_plan: JsonObject,
    user_query: str,
) -> tuple[list[Any], set[str], list[str]]:
    route_categories = set(state.get("route_categories", set()))
    matched_tools = state.get("matched_tools", [])

    # 总是返回所有可用工具，让 LLM 自主决定
    # 意图路由的预选结果只作为参考，不限制 LLM 的选择
    tools = runtime.tools.specs()

    if task_plan and isinstance(task_plan, dict):
        tools = select_tools_for_plan(runtime.tools.specs(), task_plan)

    if _prefer_rag_only(user_query) and not matched_tools:
        rag_tool = runtime.tools.get("rag_search")
        if rag_tool is not None:
            tools = [rag_tool.to_tool_spec()]

    return tools, route_categories, matched_tools
