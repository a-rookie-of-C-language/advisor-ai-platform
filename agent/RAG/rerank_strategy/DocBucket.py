from __future__ import annotations

from dataclasses import dataclass
from typing import List

from RAG.rerank_strategy.RetrievalCandidate import RetrievalCandidate


@dataclass
class DocBucket:
    key: str
    doc_score: float
    first_recall_index: int
    candidates: List[RetrievalCandidate]
