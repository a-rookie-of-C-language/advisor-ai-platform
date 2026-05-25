from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass
class EvalCase:
    """单个评估用例。"""

    id: str
    query: str
    expected_chunks: list[str] = field(default_factory=list)
    expected_answer: str = ""
    expected_annotation: JsonObject = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)
