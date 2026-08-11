from __future__ import annotations

import re

from routing.intent_router_support import (
    apply_structured_student_query_boost,
    extract_first_url,
    looks_like_student_list_or_count_query,
    match_any,
    match_count,
    pick_top_categories,
)
from routing.intent_router_tool_matching import (
    apply_tool_semantic_boost,
    find_tools_by_base_names,
    match_tools_by_patterns,
    match_tools_by_semantics,
)
from routing.RouteDecision import RouteDecision
from tools.core.base_tool import BaseTool


def route_by_rules_and_scores(
    *,
    query: str,
    compiled_rules: dict[str, dict[str, list[re.Pattern[str]]]],
    all_categories: set[str],
    tools: list[BaseTool],
    tool_patterns: list[tuple[str, re.Pattern[str]]],
    tool_semantic_keywords: dict[str, set[str]],
    tool_categories: dict[str, str],
    score_threshold: int,
) -> RouteDecision:
    if not query.strip():
        return RouteDecision(categories=set(), matched_by="none", confidence=0.0, fallback_reason="empty_query")

    matched_tools = match_tools_by_patterns(query, tool_patterns)
    normalized_query = query.strip().lower()

    student_list_tools = find_tools_by_base_names(tools, {"list_students"})
    if "student" in all_categories and student_list_tools and looks_like_student_list_or_count_query(normalized_query):
        return RouteDecision(
            categories={"student"},
            matched_by="strong_rule",
            confidence=0.99,
            reason="student_list_or_count_query",
            scores={"student": 6},
            matched_tools=student_list_tools,
        )

    url = extract_first_url(query)
    if url:
        fetch_tools = find_tools_by_base_names(tools, {"web_fetch"})
        if fetch_tools:
            categories = {"search"} if "search" in all_categories else set(all_categories)
            return RouteDecision(
                categories=categories,
                matched_by="strong_rule",
                confidence=0.99,
                reason="url_detected_fetch",
                scores={"search": 6} if "search" in categories else {},
                matched_tools=fetch_tools,
            )

    strong_hits: set[str] = set()
    scores: dict[str, int] = {}
    for category, layers in compiled_rules.items():
        if category not in all_categories:
            continue
        score = 0
        if match_any(layers.get("strong", []), query):
            strong_hits.add(category)
            score += 5
        weak_hit_count = match_count(layers.get("weak", []), query)
        if weak_hit_count:
            score += weak_hit_count * 2
        if score > 0:
            scores[category] = score

    semantic_matched_tools = match_tools_by_semantics(normalized_query, tool_semantic_keywords)
    matched_tools = sorted(set(matched_tools) | set(semantic_matched_tools))
    apply_tool_semantic_boost(scores, semantic_matched_tools, all_categories, tool_categories)
    apply_structured_student_query_boost(scores, normalized_query, all_categories)

    if len(strong_hits) == 1:
        category = next(iter(strong_hits))
        return RouteDecision(
            categories={category},
            matched_by="strong_rule",
            confidence=0.98,
            scores=scores,
            matched_tools=matched_tools,
        )

    if len(strong_hits) > 1:
        top = pick_top_categories(scores, minimum_score=5)
        return RouteDecision(
            categories=top,
            matched_by="strong_conflict",
            confidence=0.55,
            fallback_reason="strong_conflict",
            scores=scores,
            matched_tools=matched_tools,
        )

    scored = pick_top_categories(scores, minimum_score=score_threshold)
    if len(scored) == 1:
        return RouteDecision(
            categories=scored,
            matched_by="score",
            confidence=0.88,
            scores=scores,
            matched_tools=matched_tools,
        )
    if len(scored) > 1:
        return RouteDecision(
            categories=scored,
            matched_by="score_conflict",
            confidence=0.6,
            fallback_reason="score_conflict",
            scores=scores,
            matched_tools=matched_tools,
        )

    if matched_tools:
        return RouteDecision(
            categories={"general"},
            matched_by="tool_pattern",
            confidence=0.85,
            fallback_reason="no_category_match_but_tool_matched",
            scores=scores,
            matched_tools=matched_tools,
        )

    return RouteDecision(
        categories=set(),
        matched_by="none",
        confidence=0.0,
        fallback_reason="score_below_threshold",
        scores=scores,
        matched_tools=matched_tools,
    )
