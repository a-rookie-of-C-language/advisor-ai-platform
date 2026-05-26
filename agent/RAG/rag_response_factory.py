from __future__ import annotations

from RAG.schema import RAGChunkHit, RAGSearchDebugTrace, RAGSearchError, RAGSearchResponse


def build_rag_error_response(
    *,
    trace_id: str,
    query: str,
    code: str,
    message: str,
    latency_ms: int,
) -> RAGSearchResponse:
    return RAGSearchResponse(
        ok=False,
        trace_id=trace_id,
        query=query,
        error=RAGSearchError(code=code, message=message),
        debug=RAGSearchDebugTrace(latency_ms=latency_ms),
    )


def build_rag_success_response(
    *,
    trace_id: str,
    query: str,
    items: list[RAGChunkHit],
    latency_ms: int,
    rewritten_query: str | None = None,
    recall_k: int | None = None,
    rerank_model: str | None = None,
) -> RAGSearchResponse:
    return RAGSearchResponse(
        ok=True,
        trace_id=trace_id,
        query=query,
        items=items,
        debug=RAGSearchDebugTrace(
            rewritten_query=rewritten_query,
            recall_k=recall_k,
            rerank_model=rerank_model,
            latency_ms=latency_ms,
        ),
    )
