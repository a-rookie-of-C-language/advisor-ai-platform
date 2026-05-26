from __future__ import annotations

from graph.helpers import (
    _build_delegate_reasoning,
    _build_plan_reasoning,
    _build_route_reasoning,
)
from json_types import JsonObject


def should_emit_planning_reasoning(*, education_domain: bool, exploration_query: bool) -> bool:
    return education_domain or exploration_query


def build_route_reasoning_payload(*, route_decision, matched_tools: list[str], education_domain: bool) -> JsonObject:
    return {
        "stage": "route",
        "message": _build_route_reasoning(
            route_categories=sorted(route_decision.categories),
            matched_tools=matched_tools,
            education_domain=education_domain,
        ),
        "categories": sorted(route_decision.categories),
        "matched_tools": matched_tools,
    }


def build_delegate_reasoning_payload(agent_name: str) -> JsonObject:
    return {
        "stage": "delegate",
        "agent_name": agent_name,
        "message": _build_delegate_reasoning(agent_name),
    }


def build_plan_reasoning_payload(task_plan: JsonObject) -> JsonObject:
    return {
        "stage": "plan",
        "message": _build_plan_reasoning(task_plan),
        "mode": task_plan.get("mode", ""),
        "summary": task_plan.get("summary", ""),
    }


def explorer_event_source(event_name: str) -> str:
    return "tool" if event_name.startswith("tool_") else "system"
