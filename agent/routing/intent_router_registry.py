from __future__ import annotations

import re

from tools.core.base_tool import BaseTool


def compile_category_rules(
    rules: dict[str, dict[str, list[str]]],
) -> dict[str, dict[str, list[re.Pattern[str]]]]:
    return {
        category: {
            layer: [re.compile(pattern) for pattern in patterns]
            for layer, patterns in layers.items()
        }
        for category, layers in rules.items()
    }


def build_tool_route_metadata(
    tools: list[BaseTool],
) -> tuple[list[tuple[str, re.Pattern[str]]], dict[str, set[str]], dict[str, str]]:
    tool_patterns: list[tuple[str, re.Pattern[str]]] = []
    tool_semantic_keywords: dict[str, set[str]] = {}
    tool_categories: dict[str, str] = {}
    for tool in tools:
        for pattern in tool.get_query_patterns():
            tool_patterns.append((tool.name, re.compile(pattern)))
        raw_keywords = getattr(tool, "get_semantic_keywords", lambda: [])()
        keywords = {str(item).strip().lower() for item in raw_keywords if str(item).strip()}
        if keywords:
            tool_semantic_keywords[tool.name] = keywords
        category = str(getattr(tool, "category", "") or "").strip()
        if category:
            tool_categories[tool.name] = category
    return tool_patterns, tool_semantic_keywords, tool_categories
