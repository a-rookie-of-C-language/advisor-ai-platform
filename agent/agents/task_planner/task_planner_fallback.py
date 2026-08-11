from __future__ import annotations

from agents.task_planner.task_planner_name_utils import coerce_names
from json_types import JsonObject
from llm.tool_spec import ToolSpec


def looks_like_education_query(query: str) -> bool:
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


def looks_like_realtime_query(query: str) -> bool:
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


def build_web_query(query: str, route_categories: list[str]) -> str:
    normalized = query.strip()
    if not normalized:
        return ""
    if "search" in route_categories:
        return normalized
    return normalized


def build_fallback_plan(
    *,
    user_query: str,
    available_tools: list[ToolSpec],
    route_context: JsonObject,
) -> JsonObject:
    tool_names = {tool.name for tool in available_tools}
    route_categories = coerce_names(route_context.get("categories", []))
    matched_tools = coerce_names(route_context.get("matched_tools", []))
    preferred_tools = coerce_names(route_context.get("preferred_tools", []))
    normalized_query = user_query.strip()
    steps: list[JsonObject] = []

    rag_needed = "rag_search" in tool_names and (
        "retrieval" in route_categories
        or "rag_search" in preferred_tools
        or looks_like_education_query(normalized_query)
        or any(name == "rag_search" for name in matched_tools)
    )
    web_needed = "web_search" in tool_names and (
        "search" in route_categories or looks_like_realtime_query(normalized_query)
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
        web_query = build_web_query(normalized_query, route_categories)
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
