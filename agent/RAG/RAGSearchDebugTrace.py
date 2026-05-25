from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class RAGSearchDebugTrace:
    latency_ms: int
    rewritten_query: Optional[str] = None
    recall_k: Optional[int] = None
    rerank_model: Optional[str] = None
