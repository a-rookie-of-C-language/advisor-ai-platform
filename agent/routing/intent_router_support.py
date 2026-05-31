from __future__ import annotations

import re

from json_types import JsonValue
from routing.intent_router_rules import CATEGORY_ALIASES, CATEGORY_DESCRIPTIONS, URL_PATTERN


def extract_first_url(query: str) -> str | None:
    found = URL_PATTERN.search(query or "")
    if not found:
        return None
    return found.group(0)


def looks_like_student_list_or_count_query(normalized_query: str) -> bool:
    has_student = "学生" in normalized_query
    has_list_or_count = any(
        token in normalized_query
        for token in (
            "列表",
            "名单",
            "有哪些",
            "所有",
            "全部",
            "多少",
            "几个",
            "几名",
            "数量",
            "总数",
            "共有",
            "当前",
            "现在",
        )
    )
    return has_student and has_list_or_count


def apply_structured_student_query_boost(
    scores: dict[str, int],
    normalized_query: str,
    all_categories: set[str],
) -> None:
    if "student" not in all_categories:
        return
    has_student = any(token in normalized_query for token in ("学生", "学号", "姓名"))
    has_structured_db_intent = any(token in normalized_query for token in ("数据库", "表", "记录", "查询", "查找"))
    if has_student and has_structured_db_intent:
        scores["student"] = scores.get("student", 0) + 4


def match_any(patterns: list[re.Pattern[str]], query: str) -> bool:
    return any(pattern.search(query) for pattern in patterns)


def match_count(patterns: list[re.Pattern[str]], query: str) -> int:
    return sum(1 for pattern in patterns if pattern.search(query))


def pick_top_categories(scores: dict[str, int], *, minimum_score: int) -> set[str]:
    eligible = {category: score for category, score in scores.items() if score >= minimum_score}
    if not eligible:
        return set()
    top_score = max(eligible.values())
    if top_score <= 0:
        return set()
    return {category for category, score in eligible.items() if score == top_score}


def coerce_categories(raw_categories: JsonValue) -> list[str]:
    if isinstance(raw_categories, list):
        return [str(item).strip() for item in raw_categories if str(item).strip()]
    if isinstance(raw_categories, str) and raw_categories.strip():
        return [raw_categories.strip()]
    return []


def coerce_confidence(raw_confidence: JsonValue) -> float:
    try:
        confidence = float(raw_confidence)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(confidence, 1.0))


def normalize_categories(categories: set[str], compiled_categories: set[str]) -> set[str]:
    normalized: set[str] = set()
    for category in categories:
        mapped = CATEGORY_ALIASES.get(category, category)
        if mapped == "meta" and "skill" in compiled_categories:
            normalized.add("skill")
            normalized.add("meta")
            continue
        normalized.add(mapped)
        if mapped == "skill":
            normalized.add("meta")
    return normalized


def describe_category(category: str) -> str:
    return CATEGORY_DESCRIPTIONS.get(category, "通用能力")
