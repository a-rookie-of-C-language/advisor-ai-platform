from __future__ import annotations

import re
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from RAG.embedding_engine.ollama_embedding_engine import OllamaEmbeddingEngine
from RAG.rag_dao import PgVectorDAO
from RAG.rerank_strategy import (
    ChunkDocTwoStageRerankStrategy,
    ChunkScoreRerankStrategy,
    RerankStrategyRegistry,
    RetrievalCandidate,
    TitleBoostRerankStrategy,
)
from RAG.schema import (
    RAGChunkHit,
    RAGRawSearchData,
    RAGSearchDebugTrace,
    RAGSearchError,
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
        self.rerank_registry.register(TitleBoostRerankStrategy())
        self.rerank_registry.register(ChunkDocTwoStageRerankStrategy())

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

    @staticmethod
    def _latency_ms(started_at: float) -> int:
        return int((time.time() - started_at) * 1000)

    @staticmethod
    def _to_request(req: RAGSearchRequest | Dict[str, Any]) -> RAGSearchRequest:
        return req if isinstance(req, RAGSearchRequest) else RAGSearchRequest(**req)

    @staticmethod
    def _extract_doc_ids(request: RAGSearchRequest) -> Optional[List[int]]:
        return request.filters.doc_ids if request.filters else None

    @staticmethod
    def _build_source_type(source: str, metadata: Dict[str, Any]) -> str:
        source_type = str(metadata.get("source_type", "")).lower()
        if not source_type and source:
            source_type = Path(source).suffix.replace(".", "").lower()
        return source_type

    def _build_candidate_rows(
        self,
        request: RAGSearchRequest,
        rewritten_query: str,
        raw_data: RAGRawSearchData,
    ) -> List[RetrievalCandidate]:
        candidate_rows: List[RetrievalCandidate] = []

        for idx, chunk_id in enumerate(raw_data.ids):
            text = raw_data.documents[idx] if idx < len(raw_data.documents) else ""
            metadata = raw_data.metadatas[idx] if idx < len(raw_data.metadatas) and raw_data.metadatas[idx] else {}
            distance = raw_data.distances[idx] if idx < len(raw_data.distances) else 0.0
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
            source_type = self._build_source_type(source, metadata)
            doc_title = str(metadata.get("doc_title") or metadata.get("title") or source or "unknown")
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

        return candidate_rows

    def _rank_candidate_rows(
        self,
        request: RAGSearchRequest,
        candidate_rows: List[RetrievalCandidate],
    ) -> List[RetrievalCandidate]:
        if request.use_rerank:
            processors = self.rerank_registry.get_enabled_ordered()
            if not processors:
                return sorted(candidate_rows, key=lambda row: (-row.score, row.recall_index))[: request.top_k]

            ranked_rows = list(candidate_rows)
            for processor in processors:
                ranked_rows = processor.rank(ranked_rows, top_k=len(ranked_rows))
                if not ranked_rows:
                    break
            return ranked_rows[: request.top_k]
        return sorted(candidate_rows, key=lambda row: row.recall_index)[: request.top_k]

    def _current_rerank_chain_name(self) -> str:
        processors = self.rerank_registry.get_enabled_ordered()
        if not processors:
            return "none"
        return ">".join(processor.name for processor in processors)

    def _load_live_title_map(
        self,
        candidate_rows: List[RetrievalCandidate],
        preset_title_map: Optional[Dict[int, str]] = None,
    ) -> Dict[int, str]:
        if preset_title_map is not None:
            return preset_title_map

        all_doc_ids = list({row.hit.doc_id for row in candidate_rows if row.hit.doc_id > 0})
        if not all_doc_ids:
            return {}
        return self.dao.get_doc_title_map(all_doc_ids)

    @staticmethod
    def _build_ranked_items(
        ranked_rows: List[RetrievalCandidate],
        live_title_map: Dict[int, str],
    ) -> List[RAGChunkHit]:
        items: List[RAGChunkHit] = []
        for rank, row in enumerate(ranked_rows, start=1):
            hit = row.hit
            if hit.doc_id > 0 and hit.doc_id in live_title_map:
                hit.doc_title = live_title_map[hit.doc_id]
            hit.rank = rank
            items.append(hit)
        return items

    def _execute_retrieval(
        self,
        request: RAGSearchRequest,
        rewritten_query: str,
        recall_k: int,
    ) -> RAGRawSearchData:
        doc_ids = self._extract_doc_ids(request)
        query_vector = self.embedding_engine.embed_texts([rewritten_query])[0]
        raw = self.dao.search(
            query_vector=query_vector,
            kb_id=request.kb_id,
            top_k=recall_k,
            doc_ids=doc_ids,
        )
        return RAGRawSearchData.from_dao_result(raw)

    def _run_pipeline_from_raw(
        self,
        request: RAGSearchRequest,
        rewritten_query: str,
        raw_data: RAGRawSearchData,
        live_title_map: Optional[Dict[int, str]] = None,
    ) -> List[RAGChunkHit]:
        candidate_rows = self._build_candidate_rows(request, rewritten_query, raw_data)
        ranked_rows = self._rank_candidate_rows(request, candidate_rows)
        title_map = self._load_live_title_map(candidate_rows, live_title_map)
        return self._build_ranked_items(ranked_rows, title_map)

    def rag_search(self, req: RAGSearchRequest | Dict[str, Any]) -> RAGSearchResponse:
        started_at = time.time()
        trace_id = uuid4().hex

        try:
            request = self._to_request(req)
        except Exception as exc:
            return RAGSearchResponse(
                ok=False,
                trace_id=trace_id,
                query=req.get("query", "") if isinstance(req, dict) else "",
                error=RAGSearchError(code="INVALID_INPUT", message=str(exc)),
                debug=RAGSearchDebugTrace(latency_ms=self._latency_ms(started_at)),
            )

        try:
            rewritten_query = self._rewrite_query_text(request.query) if request.rewrite_query else request.query
            recall_k = self._compute_recall_k(
                top_k=request.top_k,
                mode=request.mode.value,
                use_rerank=request.use_rerank,
            )
            raw_data = self._execute_retrieval(request, rewritten_query, recall_k)
            items = self._run_pipeline_from_raw(request, rewritten_query, raw_data)

            return RAGSearchResponse(
                ok=True,
                trace_id=trace_id,
                query=request.query,
                items=items,
                debug=RAGSearchDebugTrace(
                    rewritten_query=rewritten_query if request.rewrite_query else None,
                    recall_k=recall_k,
                    rerank_model=self._current_rerank_chain_name() if request.use_rerank else None,
                    latency_ms=self._latency_ms(started_at),
                ),
            )

        except Exception as exc:
            return RAGSearchResponse(
                ok=False,
                trace_id=trace_id,
                query=request.query if isinstance(request, RAGSearchRequest) else "",
                error=RAGSearchError(code="VECTORSTORE_ERROR", message=str(exc)),
                debug=RAGSearchDebugTrace(latency_ms=self._latency_ms(started_at)),
            )

    def rag_search_from_raw(
        self,
        req: RAGSearchRequest | Dict[str, Any],
        raw: Dict[str, Any] | RAGRawSearchData,
        live_title_map: Optional[Dict[int, str]] = None,
    ) -> RAGSearchResponse:
        """最小测试入口：跳过 embedding/DAO.search，直接使用原始召回结果构建响应。"""
        started_at = time.time()
        trace_id = uuid4().hex

        try:
            request = self._to_request(req)
            raw_data = raw if isinstance(raw, RAGRawSearchData) else RAGRawSearchData.from_dao_result(raw)
        except Exception as exc:
            return RAGSearchResponse(
                ok=False,
                trace_id=trace_id,
                query=req.get("query", "") if isinstance(req, dict) else "",
                error=RAGSearchError(code="INVALID_INPUT", message=str(exc)),
                debug=RAGSearchDebugTrace(latency_ms=self._latency_ms(started_at)),
            )

        try:
            rewritten_query = self._rewrite_query_text(request.query) if request.rewrite_query else request.query
            recall_k = self._compute_recall_k(
                top_k=request.top_k,
                mode=request.mode.value,
                use_rerank=request.use_rerank,
            )
            items = self._run_pipeline_from_raw(
                request=request,
                rewritten_query=rewritten_query,
                raw_data=raw_data,
                live_title_map=live_title_map,
            )

            return RAGSearchResponse(
                ok=True,
                trace_id=trace_id,
                query=request.query,
                items=items,
                debug=RAGSearchDebugTrace(
                    rewritten_query=rewritten_query if request.rewrite_query else None,
                    recall_k=recall_k,
                    rerank_model=self._current_rerank_chain_name() if request.use_rerank else None,
                    latency_ms=self._latency_ms(started_at),
                ),
            )

        except Exception as exc:
            return RAGSearchResponse(
                ok=False,
                trace_id=trace_id,
                query=request.query,
                error=RAGSearchError(code="VECTORSTORE_ERROR", message=str(exc)),
                debug=RAGSearchDebugTrace(latency_ms=self._latency_ms(started_at)),
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
