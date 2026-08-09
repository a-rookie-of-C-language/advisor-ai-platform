from __future__ import annotations

from routing.intent_router_rules import DEFAULT_READ_ONLY_CATEGORIES
from routing.RouteDecision import RouteDecision


def build_fallback_decision(
    all_categories: set[str],
    *,
    reason: str,
    allow_destructive_fallback: bool,
    scores: dict[str, int] | None = None,
    matched_tools: list[str] | None = None,
) -> RouteDecision:
    fallback_categories = set(all_categories & DEFAULT_READ_ONLY_CATEGORIES)
    if allow_destructive_fallback:
        fallback_categories = set(all_categories)
    if not fallback_categories:
        fallback_categories = set(all_categories)
    return RouteDecision(
        categories=fallback_categories,
        matched_by="fallback",
        confidence=0.2,
        fallback_reason=reason,
        scores=scores,
        matched_tools=matched_tools,
    )
