from __future__ import annotations

import re
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence
from uuid import uuid4

from RAG.rag_dao import PgVectorDAO
from RAG.embedding_engine.ollama_embedding_engine import OllamaEmbeddingEngine
from RAG.rerank_strategy import (
    ChunkDocTwoStageRerankStrategy,
    ChunkScoreRerankStrategy,
    RetrievalCandidate,
    RerankStrategyRegistry,
    TitleBoostChunkDocRerankStrategy,
)
from RAG.schema import (
    RAGChunkHit,
    RAGSearchDebugTrace,
    RAGSearchError,
    RAGSearchFilters,
    RAGSearchRequest,
    RAGSearchResponse,
    ScoreType,
)


class RAG_service:
    """Service layer that maps tool schema <-> DAO standard interface."""

    def __init__(
        self,
        db_dsn: str,
        dao: Optional[PgVectorDAO] = None,
        ollama_base_url: str = "http://localhost:11434",
        embedding_model: str = "bge-m3",
    ) -> None:
        self.dao = dao or PgVectorDAO(db_dsn=db_dsn)
        self.embedding_engine = OllamaEmbeddingEngine(model=embedding_model, base_url=ollama_base_url)
        self.rerank_registry = RerankStrategyRegistry()
        self.rerank_registry.register(ChunkScoreRerankStrategy())
        self.rerank_registry.register(ChunkDocTwoStageRerankStrategy())
        self.rerank_registry.register(TitleBoostChunkDocRerankStrategy())
        self.default_rerank_strategy_name = "title_boost_chunk_doc_v1"

    @staticmethod
    def _normalize_distance(distance: float) -> float:
        if distance < 0:
            return 0.0
        return round(1.0 / (1.0 + distance), 6)

    @staticmethod
    def _to_doc_id(value: Any) -> int:
        try:
            return int(value)
        except Exception:
            return 0

    @staticmethod
    def _rewrite_query_text(query: str) -> str:
        normalized = unicodedata.normalize("NFKC", query).strip()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized

    @staticmethod
    def _tokenize_for_lexical_score(text: str) -> List[str]:
        if not text:
            return []
        lowered = text.lower()
        return re.findall(r"[a-z0-9_]+|[\u4e00-\u9fff]", lowered)

    @classmethod
    def _lexical_score(cls, query: str, text: str) -> float:
        q_tokens = set(cls._tokenize_for_lexical_score(query))
        if not q_tokens:
            return 0.0
        t_tokens = set(cls._tokenize_for_lexical_score(text))
        if not t_tokens:
            return 0.0
        overlap = len(q_tokens.intersection(t_tokens))
        return round(overlap / max(len(q_tokens), 1), 6)

    @staticmethod
    def _compute_recall_k(top_k: int, mode: str, use_rerank: bool) -> int:
        if not use_rerank:
            return top_k
        if mode == "hybrid":
            return min(top_k * 6, 100)
        return min(top_k * 3, 100)

    def rag_search(self, req: RAGSearchRequest | Dict[str, Any]) -> RAGSearchResponse:
        started_at = time.time()
        trace_id = uuid4().hex

        try:
            request = req if isinstance(req, RAGSearchRequest) else RAGSearchRequest(**req)
        except Exception as exc:
            return RAGSearchResponse(
                ok=False,
                trace_id=trace_id,
                query=req.get("query", "") if isinstance(req, dict) else "",
                error=RAGSearchError(code="INVALID_INPUT", message=str(exc)),
                debug=RAGSearchDebugTrace(latency_ms=int((time.time() - started_at) * 1000)),
            )

        try:
            rewritten_query = (
                self._rewrite_query_text(request.query) if request.rewrite_query else request.query
            )
            recall_k = self._compute_recall_k(
                top_k=request.top_k,
                mode=request.mode.value,
                use_rerank=request.use_rerank,
            )

            doc_ids = request.filters.doc_ids if request.filters else None

            query_vector = self.embedding_engine.embed_texts([rewritten_query])[0]

            raw = self.dao.search(
                query_vector=query_vector,
                kb_id=request.kb_id,
                top_k=recall_k,
                doc_ids=doc_ids,
            )

            ids = (raw.get("ids") or [[]])[0]
            docs = (raw.get("documents") or [[]])[0]
            metadatas = (raw.get("metadatas") or [[]])[0]
            distances = (raw.get("distances") or [[]])[0]

            candidate_rows: List[RetrievalCandidate] = []
            for idx, chunk_id in enumerate(ids):
                text = docs[idx] if idx < len(docs) else ""
                metadata = metadatas[idx] if idx < len(metadatas) and metadatas[idx] else {}
                distance = distances[idx] if idx < len(distances) else 0.0
                vector_score = self._normalize_distance(float(distance))

                lexical_score = self._lexical_score(rewritten_query, text)
                if request.mode.value == "hybrid":
                    fused_score = round(0.7 * vector_score + 0.3 * lexical_score, 6)
                else:
                    fused_score = vector_score

                score = fused_score if request.use_rerank else vector_score

                if request.min_score is not None and score < request.min_score:
                    continue

                source = str(metadata.get("source", ""))
                source_type = str(metadata.get("source_type", "")).lower()
                if not source_type and source:
                    source_type = Path(source).suffix.replace(".", "").lower()

                doc_title = str(
                    metadata.get("doc_title") or metadata.get("title") or source or "unknown"
                )
                doc_id = self._to_doc_id(metadata.get("document_id"))

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

            all_doc_ids = list({row.hit.doc_id for row in candidate_rows if row.hit.doc_id > 0})
            live_title_map: Dict[int, str] = {}
            if all_doc_ids:
                live_title_map = self.dao.get_doc_title_map(all_doc_ids)

            if request.use_rerank:
                strategy = self.rerank_registry.get(self.default_rerank_strategy_name)
                ranked_rows = strategy.rank(candidate_rows, request.top_k)
            else:
                ranked_rows = sorted(
                    candidate_rows, key=lambda row: row.recall_index
                )[: request.top_k]

            items: List[RAGChunkHit] = []
            for rank, row in enumerate(ranked_rows, start=1):
                hit = row.hit
                if hit.doc_id > 0 and hit.doc_id in live_title_map:
                    hit.doc_title = live_title_map[hit.doc_id]
                hit.rank = rank
                items.append(hit)

            return RAGSearchResponse(
                ok=True,
                trace_id=trace_id,
                query=request.query,
                items=items,
                debug=RAGSearchDebugTrace(
                    rewritten_query=rewritten_query if request.rewrite_query else None,
                    recall_k=recall_k,
                    rerank_model=self.default_rerank_strategy_name if request.use_rerank else None,
                    latency_ms=int((time.time() - started_at) * 1000),
                ),
            )

        except Exception as exc:
            return RAGSearchResponse(
                ok=False,
                trace_id=trace_id,
                query=request.query if isinstance(request, RAGSearchRequest) else "",
                error=RAGSearchError(code="VECTORSTORE_ERROR", message=str(exc)),
                debug=RAGSearchDebugTrace(latency_ms=int((time.time() - started_at) * 1000)),
            )

    def tool_run(self, query: str, kb_id: int = 1) -> str:
        """简单入口，供旧调用方使用。"""
        result = self.rag_search({"query": query, "kb_id": kb_id, "top_k": 3})
        if not result.ok:
            err = result.error
            if err is not None:
                return f"RAG search failed: {err.code} - {err.message}"
            return "RAG search failed: unknown error"
        if not result.items:
            return "No relevant context found."
        top = result.items[0]
        return f"[{top.source}] {top.text[:200]}"

    def close(self) -> None:
        self.dao.close()
