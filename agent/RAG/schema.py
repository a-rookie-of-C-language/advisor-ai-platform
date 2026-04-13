from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class SearchMode(str, Enum):
    dense = "dense"
    hybrid = "hybrid"


class ScoreType(str, Enum):
    similarity = "similarity"


@dataclass
class RAGSearchFilters:
    doc_ids: Optional[List[int]] = None
    source_types: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class RAGSearchRequest:
    query: str
    kb_id: int
    top_k: int = 5
    mode: SearchMode = SearchMode.dense
    min_score: Optional[float] = None
    use_rerank: bool = True
    rewrite_query: bool = False
    filters: Optional[RAGSearchFilters] = None


@dataclass
class RAGChunkHit:
    chunk_id: str
    doc_id: int
    doc_title: str
    source: str
    source_type: str
    text: str
    score: float
    score_type: ScoreType
    rank: int
    metadata: Dict[str, Any]


@dataclass
class RAGSearchError:
    code: str
    message: str


@dataclass
class RAGSearchDebugTrace:
    latency_ms: int
    rewritten_query: Optional[str] = None
    recall_k: Optional[int] = None
    rerank_model: Optional[str] = None


@dataclass
class RAGSearchResponse:
    ok: bool
    trace_id: str
    query: str
    items: List[RAGChunkHit] = field(default_factory=list)
    error: Optional[RAGSearchError] = None
    debug: Optional[RAGSearchDebugTrace] = None
