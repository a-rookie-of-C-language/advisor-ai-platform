from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SourceCandidate:
    """跨源候选结果，统一 RAG / Web / 用户上下文的数据结构。"""

    content: str
    source: str
    score: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)
    # metadata 关键字段:
    #   type: str            — 数据类型 (product / policy / general)
    #   effective_date: str  — 生效日期 (ISO 格式)
    #   authority: str       — 权威性 (official / secondary)
    #   page_number: int     — 页码 (RAG 切片)
