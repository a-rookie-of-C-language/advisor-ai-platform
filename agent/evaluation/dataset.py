from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class EvalCase:
    """单个评估用例。"""

    id: str
    query: str
    expected_chunks: list[str] = field(default_factory=list)
    expected_answer: str = ""
    expected_annotation: dict[str, Any] = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)


@dataclass
class EvalDataset:
    """评估测试集。"""

    name: str
    version: str
    kb_id: int
    cases: list[EvalCase]

    @classmethod
    def load(cls, path: str | Path) -> EvalDataset:
        """从 JSON 文件加载测试集。"""
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        cases = [
            EvalCase(
                id=c["id"],
                query=c["query"],
                expected_chunks=c.get("expected_chunks", []),
                expected_answer=c.get("expected_answer", ""),
                expected_annotation=c.get("expected_annotation", {}),
                tags=c.get("tags", []),
            )
            for c in data["cases"]
        ]

        return cls(
            name=data["name"],
            version=data["version"],
            kb_id=data["kb_id"],
            cases=cases,
        )
