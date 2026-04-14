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


@dataclass
class RAGRawSearchData:
    """检索原始结果的标准化结构，用于纯逻辑测试注入。"""

    ids: List[str] = field(default_factory=list)
    documents: List[str] = field(default_factory=list)
    metadatas: List[Dict[str, Any]] = field(default_factory=list)
    distances: List[float] = field(default_factory=list)

    @classmethod
    def from_dao_result(cls, raw: Dict[str, Any]) -> "RAGRawSearchData":
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
