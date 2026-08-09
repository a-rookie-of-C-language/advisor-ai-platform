from __future__ import annotations

from dataclasses import dataclass

from RAG.rag_scoring import compute_recall_k, rewrite_query_text
from RAG.schema import RAGSearchRequest


@dataclass(frozen=True)
class RAGSearchPlan:
    rewritten_query: str
    recall_k: int
    response_rewritten_query: str | None


def build_rag_search_plan(request: RAGSearchRequest) -> RAGSearchPlan:
    rewritten_query = rewrite_query_text(request.query) if request.rewrite_query else request.query
    recall_k = compute_recall_k(
        top_k=request.top_k,
        mode=request.mode.value,
        use_rerank=request.use_rerank,
    )
    return RAGSearchPlan(
        rewritten_query=rewritten_query,
        recall_k=recall_k,
        response_rewritten_query=rewritten_query if request.rewrite_query else None,
    )
