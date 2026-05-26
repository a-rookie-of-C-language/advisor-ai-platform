from __future__ import annotations

from typing import List

from RAG.rag_scoring import build_source_type, lexical_score, normalize_distance, to_doc_id
from RAG.rerank_strategy import RetrievalCandidate
from RAG.schema import RAGChunkHit, RAGRawSearchData, RAGSearchRequest, ScoreType


def build_candidate_rows(
    request: RAGSearchRequest,
    rewritten_query: str,
    raw_data: RAGRawSearchData,
) -> List[RetrievalCandidate]:
    candidate_rows: List[RetrievalCandidate] = []

    for idx, chunk_id in enumerate(raw_data.ids):
        text = raw_data.documents[idx] if idx < len(raw_data.documents) else ""
        metadata = raw_data.metadatas[idx] if idx < len(raw_data.metadatas) and raw_data.metadatas[idx] else {}
        distance = raw_data.distances[idx] if idx < len(raw_data.distances) else 0.0
        vector_score = normalize_distance(float(distance))

        lexical_score_value = lexical_score(rewritten_query, text)
        if request.mode.value == "hybrid":
            fused_score = round(0.7 * vector_score + 0.3 * lexical_score_value, 6)
        else:
            fused_score = vector_score

        score = fused_score if request.use_rerank else vector_score
        if request.min_score is not None and score < request.min_score:
            continue

        source = str(metadata.get("source", ""))
        source_type = build_source_type(source, metadata)
        doc_title = str(metadata.get("doc_title") or metadata.get("title") or source or "unknown")
        doc_id = to_doc_id(metadata.get("document_id"))

        candidate_rows.append(
            RetrievalCandidate(
                score=score,
                recall_index=idx,
                hit=RAGChunkHit(
                    chunk_id=str(chunk_id),
                    doc_id=doc_id,
                    doc_title=doc_title,
                    source=source,
                    source_type=source_type,
                    text=text,
                    score=score,
                    score_type=ScoreType.similarity,
                    rank=idx + 1,
                    metadata=metadata,
                ),
                metadata={**metadata, "_query": rewritten_query},
            )
        )

    return candidate_rows
