from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from json_types import JsonObject


@dataclass
class RAGRawSearchData:
    """检索原始结果的标准化结构，用于纯逻辑测试注入。"""

    ids: List[str] = field(default_factory=list)
    documents: List[str] = field(default_factory=list)
    metadatas: list[JsonObject] = field(default_factory=list)
    distances: List[float] = field(default_factory=list)

    @classmethod
    def from_dao_result(cls, raw: JsonObject) -> "RAGRawSearchData":
        ids = (raw.get("ids") or [[]])[0]
        documents = (raw.get("documents") or [[]])[0]
        metadatas = (raw.get("metadatas") or [[]])[0]
        distances = (raw.get("distances") or [[]])[0]

        return cls(
            ids=[str(v) for v in ids],
            documents=[str(v) for v in documents],
            metadatas=[m if isinstance(m, dict) else {} for m in metadatas],
            distances=[float(v) for v in distances],
        )
