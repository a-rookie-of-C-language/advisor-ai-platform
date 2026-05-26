from __future__ import annotations

import re

from tools.base_tool import BaseTool


def match_tools_by_patterns(query: str, tool_patterns: list[tuple[str, re.Pattern[str]]]) -> list[str]:
    matched = set()
    for tool_name, pattern in tool_patterns:
        if pattern.search(query):
            matched.add(tool_name)
    return list(matched)


def match_tools_by_semantics(
    normalized_query: str,
    tool_semantic_keywords: dict[str, set[str]],
) -> list[str]:
    if not normalized_query:
        return []
    matched: list[str] = []
    for tool_name, keywords in tool_semantic_keywords.items():
        if any(keyword in normalized_query for keyword in keywords):
            matched.append(tool_name)
    return matched


def find_tools_by_base_names(tools: list[BaseTool], base_names: set[str]) -> list[str]:
    matched: list[str] = []
    for tool in tools:
        name = str(getattr(tool, "name", "") or "").strip()
        if not name:
            continue
        if name in base_names:
            matched.append(name)
            continue
        if "__" in name:
            tail = name.split("__")[-1]
            if tail in base_names:
                matched.append(name)
    return sorted(set(matched))


def apply_tool_semantic_boost(
    scores: dict[str, int],
    matched_tools: list[str],
    all_categories: set[str],
    tool_categories: dict[str, str],
) -> None:
    for tool_name in matched_tools:
        category = tool_categories.get(tool_name, "")
        if not category or category not in all_categories:
            continue
        scores[category] = scores.get(category, 0) + 3
        scores["student"] = scores.get("student", 0) + 4
