from __future__ import annotations

from eval.ActionScore import ActionScore
from json_types import JsonObject

_TOOL_EXPECTATION_TERMS = (
    "知识库",
    "来源",
    "资料",
    "文档",
    "检索",
    "搜索",
    "根据",
    "source",
    "sources",
    "knowledge base",
    "document",
    "search",
    "retrieve",
)

_TOOL_EVENTS = {"sources", "tool_result", "tool_use", "tool_call"}


def score_action(user_query: str, trace_events: list[JsonObject]) -> ActionScore:
    should_call_tool = _should_call_tool(user_query)
    called_tool = _called_tool(trace_events)
    reasons: list[str] = []

    if should_call_tool and not called_tool:
        reasons.append("should_call_but_not_called")
        return ActionScore(
            total=70,
            should_call_tool=should_call_tool,
            called_tool=called_tool,
            reasons=reasons,
        )

    if called_tool and _has_tool_miss(trace_events):
        reasons.append("tool_called_but_missed")
        return ActionScore(
            total=85,
            should_call_tool=should_call_tool,
            called_tool=called_tool,
            reasons=reasons,
        )

    return ActionScore(
        total=100,
        should_call_tool=should_call_tool,
        called_tool=called_tool,
        reasons=reasons,
    )


def _should_call_tool(user_query: str) -> bool:
    normalized = user_query.lower()
    return any(term.lower() in normalized for term in _TOOL_EXPECTATION_TERMS)


def _called_tool(trace_events: list[JsonObject]) -> bool:
    for event in trace_events:
        event_name = str(event.get("event") or event.get("type") or "")
        if event_name in _TOOL_EVENTS:
            return True
    return False


def _has_tool_miss(trace_events: list[JsonObject]) -> bool:
    for event in trace_events:
        payload = event.get("data") or event.get("payload") or {}
        if not isinstance(payload, dict):
            continue
        if payload.get("status") == "miss":
            return True
    return False
