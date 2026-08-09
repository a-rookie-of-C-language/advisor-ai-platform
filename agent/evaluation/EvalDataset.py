from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from evaluation.EvalCase import EvalCase


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
                id=case["id"],
                query=case["query"],
                expected_chunks=case.get("expected_chunks", []),
                expected_answer=case.get("expected_answer", ""),
                expected_annotation=case.get("expected_annotation", {}),
                tags=case.get("tags", []),
            )
            for case in data["cases"]
        ]

        return cls(
            name=data["name"],
            version=data["version"],
            kb_id=data["kb_id"],
            cases=cases,
        )
