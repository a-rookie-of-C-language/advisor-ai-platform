from __future__ import annotations

from typing import Any

from json_types import JsonObject


def find_expected_chunks(cases: list[Any], query: str) -> list[str]:
    for case in cases:
        if case.query == query:
            return case.expected_chunks
    return []


def find_expected_annotation(cases: list[Any], query: str) -> JsonObject:
    for case in cases:
        if case.query == query:
            return case.expected_annotation
    return {}
