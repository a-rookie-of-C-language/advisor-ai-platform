from __future__ import annotations

from typing import List

from RAG.rerank_strategy import RerankStrategyRegistry, RetrievalCandidate
from RAG.schema import RAGSearchRequest


def rank_candidate_rows(
    request: RAGSearchRequest,
    candidate_rows: List[RetrievalCandidate],
    rerank_registry: RerankStrategyRegistry,
) -> List[RetrievalCandidate]:
    if request.use_rerank:
        processors = rerank_registry.get_enabled_ordered()
        if not processors:
            return sorted(candidate_rows, key=lambda row: (-row.score, row.recall_index))[: request.top_k]

        ranked_rows = list(candidate_rows)
        for processor in processors:
            ranked_rows = processor.rank(ranked_rows, top_k=len(ranked_rows))
            if not ranked_rows:
                break
        return ranked_rows[: request.top_k]
    return sorted(candidate_rows, key=lambda row: row.recall_index)[: request.top_k]


def current_rerank_chain_name(rerank_registry: RerankStrategyRegistry) -> str:
    processors = rerank_registry.get_enabled_ordered()
    if not processors:
        return "none"
    return ">".join(processor.name for processor in processors)
