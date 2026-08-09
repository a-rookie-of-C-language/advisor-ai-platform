from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from RAG.RAGChunkHit import RAGChunkHit
from RAG.RAGSearchDebugTrace import RAGSearchDebugTrace
from RAG.RAGSearchError import RAGSearchError


@dataclass
class RAGSearchResponse:
    ok: bool
    trace_id: str
    query: str
    items: List[RAGChunkHit] = field(default_factory=list)
    error: Optional[RAGSearchError] = None
    debug: Optional[RAGSearchDebugTrace] = None
