from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from RAG.RAGSearchFilters import RAGSearchFilters
from RAG.SearchMode import SearchMode


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
