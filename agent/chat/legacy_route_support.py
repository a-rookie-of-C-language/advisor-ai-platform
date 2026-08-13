from __future__ import annotations

from dataclasses import replace

from chat.stream_message_utils import prefer_rag_only
from json_types import JsonObject
from llm.tool_spec import ToolSpec


def _prefer_retrieval_fallback(route_decision, has_rag_tool: bool):
    if not has_rag_tool:
        return route_decision
    if route_decision.categories == {"retrieval"}:
        return route_decision
    if route_decision.matched_by in {"fallback", "strong_rule", "score"}:
        return replace(
            route_decision,
            categories={"retrieval"},
            matched_by="fallback",
            confidence=0.2,
            fallback_reason=route_decision.fallback_reason or "prefer_retrieval",
        )
    return route_decision


def filter_matched_tools(raw_matched_tools: list[str], *, tools, allowed_categories: set[str]) -> list[str]:
    return [
        name
        for name in raw_matched_tools
        if (tool := tools.get(name)) is not None and tool.category in allowed_categories
    ]


def select_route_tools(
    *,
    route_decision,
    matched_tools: list[str],
    user_query: str,
    tools,
) -> list[ToolSpec]:
    route_decision = _prefer_retrieval_fallback(route_decision, tools.get("rag_search") is not None)
    if matched_tools:
        selected_tools = tools.specs_by_names(matched_tools)
    else:
        selected_tools = tools.specs_by_categories(route_decision.categories)
    if prefer_rag_only(user_query) and not matched_tools:
        rag_tool = tools.get("rag_search")
        if rag_tool is not None:
            selected_tools = [rag_tool.to_tool_spec()]
    return selected_tools


def adjust_route_payload(
    route_payload: JsonObject,
    *,
    route_decision,
    matched_tools: list[str],
    raw_matched_tools: list[str],
) -> JsonObject:
    next_payload = route_payload
    if matched_tools != raw_matched_tools:
        next_payload = {
            **next_payload,
            "matched_tools": matched_tools,
            "source": {
                **next_payload.get("source", {}),
                "matched_tools": matched_tools,
            },
        }
    if (
        route_decision.matched_by in {"strong_rule", "score"}
        and route_decision.categories == {"search"}
        and not route_decision.matched_tools
    ):
        next_payload = {
            **next_payload,
            "matched_by": "fallback",
            "source": {
                **next_payload.get("source", {}),
                "decision": "fallback",
            },
        }
    return next_payload


def build_planner_route_context(
    *,
    route_decision,
    matched_tools: list[str],
    education_domain: bool,
) -> JsonObject:
    return {
        "categories": sorted(route_decision.categories),
        "matched_tools": matched_tools,
        "matched_by": route_decision.matched_by,
        "confidence": route_decision.confidence,
        "education_domain": education_domain,
        "preferred_tools": ["rag_search"] if education_domain else [],
    }


def build_explorer_route_context(*, route_decision, matched_tools: list[str]) -> JsonObject:
    return {
        "categories": sorted(route_decision.categories),
        "matched_tools": matched_tools,
        "matched_by": route_decision.matched_by,
        "confidence": route_decision.confidence,
    }
