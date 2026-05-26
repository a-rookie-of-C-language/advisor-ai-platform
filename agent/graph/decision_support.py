from __future__ import annotations

from json_types import JsonObject


def allowed_tool_categories(runtime) -> set[str]:
    allowed_categories = getattr(runtime.tools, "allowed_categories", None)
    return (
        allowed_categories(runtime.tool_permission)
        if callable(allowed_categories)
        else runtime.tools.all_categories()
    )


def filter_matched_tools(raw_matched_tools: list[str], *, runtime, all_categories: set[str]) -> list[str]:
    return [
        name
        for name in raw_matched_tools
        if (tool := runtime.tools.get(name)) is not None and tool.category in all_categories
    ]


def adjust_route_payload(
    route_payload: JsonObject,
    *,
    matched_tools: list[str],
    raw_matched_tools: list[str],
) -> JsonObject:
    if matched_tools == raw_matched_tools:
        return route_payload
    return {
        **route_payload,
        "matched_tools": matched_tools,
        "source": {
            **route_payload.get("source", {}),
            "matched_tools": matched_tools,
        },
    }


def build_task_plan_route_context(
    *,
    route_categories: set[str],
    matched_tools: list[str],
    education_domain: bool,
    web_search_enabled: bool,
) -> JsonObject:
    return {
        "categories": sorted(route_categories),
        "matched_tools": matched_tools,
        "education_domain": education_domain,
        "preferred_tools": ["rag_search"] if education_domain else [],
        "web_search_enabled": web_search_enabled,
    }


def allowed_tool_specs(runtime) -> list:
    return (
        runtime.tools.allowed_specs(runtime.tool_permission)
        if hasattr(runtime.tools, "allowed_specs")
        else runtime.tools.specs()
    )
