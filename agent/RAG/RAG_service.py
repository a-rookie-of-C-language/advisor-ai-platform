from __future__ import annotations

import time
from typing import Dict, List, Optional
from uuid import uuid4

from json_types import JsonObject
from RAG.rag_dao import PgVectorDAO
from RAG.rag_candidate_builder import build_candidate_rows
from RAG.rag_embedding_factory import build_embedding_engine
from RAG.rag_ranked_items import build_ranked_items
from RAG.rag_ranking_flow import current_rerank_chain_name, rank_candidate_rows
from RAG.rag_response_factory import build_rag_error_response, build_rag_success_response
from RAG.rag_search_plan import build_rag_search_plan
from RAG.rag_scoring import (
    latency_ms,
)
from RAG.rerank_strategy import (
    ChunkDocTwoStageRerankStrategy,
    ChunkScoreRerankStrategy,
    RerankStrategyRegistry,
    RetrievalCandidate,
    TitleBoostRerankStrategy,
)
from RAG.schema import RAGChunkHit, RAGRawSearchData, RAGSearchRequest, RAGSearchResponse


class RAG_service:
    """Service layer that maps tool schema <-> DAO standard interface."""

    def __init__(
        self,
        db_dsn: str,
        dao: Optional[PgVectorDAO] = None,
        ollama_base_url: str = "http://localhost:11434",
        embedding_model: str = "bge-m3",
        embedding_provider: str = "ollama",
        embedding_openai_base_url: str | None = None,
        embedding_openai_api_key: str | None = None,
    ) -> None:
        self.dao = dao or PgVectorDAO(db_dsn=db_dsn)
        self.embedding_engine = build_embedding_engine(
            embedding_provider=embedding_provider,
            embedding_model=embedding_model,
            ollama_base_url=ollama_base_url,
            embedding_openai_base_url=embedding_openai_base_url,
            embedding_openai_api_key=embedding_openai_api_key,
        )
        self.rerank_registry = RerankStrategyRegistry()
        self.rerank_registry.register(ChunkScoreRerankStrategy())
        self.rerank_registry.register(TitleBoostRerankStrategy())
        self.rerank_registry.register(ChunkDocTwoStageRerankStrategy())

    @staticmethod
    def _to_request(req: RAGSearchRequest | JsonObject) -> RAGSearchRequest:
        return req if isinstance(req, RAGSearchRequest) else RAGSearchRequest(**req)

    @staticmethod
    def _extract_doc_ids(request: RAGSearchRequest) -> Optional[List[int]]:
        return request.filters.doc_ids if request.filters else None

    def _current_rerank_chain_name(self) -> str:
        return current_rerank_chain_name(self.rerank_registry)

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
        candidate_rows = build_candidate_rows(request, rewritten_query, raw_data)
        ranked_rows = rank_candidate_rows(request, candidate_rows, self.rerank_registry)
        title_map = self._load_live_title_map(candidate_rows, live_title_map)
        return build_ranked_items(ranked_rows, title_map)

    def rag_search(self, req: RAGSearchRequest | JsonObject) -> RAGSearchResponse:
        started_at = time.time()
        trace_id = uuid4().hex

        try:
            request = self._to_request(req)
        except Exception as exc:
            return build_rag_error_response(
                trace_id=trace_id,
                query=req.get("query", "") if isinstance(req, dict) else "",
                code="INVALID_INPUT",
                message=str(exc),
                latency_ms=latency_ms(started_at),
            )

        try:
            plan = build_rag_search_plan(request)
            raw_data = self._execute_retrieval(request, plan.rewritten_query, plan.recall_k)
            items = self._run_pipeline_from_raw(request, plan.rewritten_query, raw_data)

            return build_rag_success_response(
                trace_id=trace_id,
                query=request.query,
                items=items,
                rewritten_query=plan.response_rewritten_query,
                recall_k=plan.recall_k,
                rerank_model=self._current_rerank_chain_name() if request.use_rerank else None,
                latency_ms=latency_ms(started_at),
            )

        except Exception as exc:
            return build_rag_error_response(
                trace_id=trace_id,
                query=request.query if isinstance(request, RAGSearchRequest) else "",
                code="VECTORSTORE_ERROR",
                message=str(exc),
                latency_ms=latency_ms(started_at),
            )

    def rag_search_from_raw(
        self,
        req: RAGSearchRequest | JsonObject,
        raw: JsonObject | RAGRawSearchData,
        live_title_map: Optional[Dict[int, str]] = None,
    ) -> RAGSearchResponse:
        """最小测试入口：跳过 embedding/DAO.search，直接使用原始召回结果构建响应。"""
        started_at = time.time()
        trace_id = uuid4().hex

        try:
            request = self._to_request(req)
            raw_data = raw if isinstance(raw, RAGRawSearchData) else RAGRawSearchData.from_dao_result(raw)
        except Exception as exc:
            return build_rag_error_response(
                trace_id=trace_id,
                query=req.get("query", "") if isinstance(req, dict) else "",
                code="INVALID_INPUT",
                message=str(exc),
                latency_ms=latency_ms(started_at),
            )

        try:
            plan = build_rag_search_plan(request)
            items = self._run_pipeline_from_raw(
                request=request,
                rewritten_query=plan.rewritten_query,
                raw_data=raw_data,
                live_title_map=live_title_map,
            )

            return build_rag_success_response(
                trace_id=trace_id,
                query=request.query,
                items=items,
                rewritten_query=plan.response_rewritten_query,
                recall_k=plan.recall_k,
                rerank_model=self._current_rerank_chain_name() if request.use_rerank else None,
                latency_ms=latency_ms(started_at),
            )

        except Exception as exc:
            return build_rag_error_response(
                trace_id=trace_id,
                query=request.query,
                code="VECTORSTORE_ERROR",
                message=str(exc),
                latency_ms=latency_ms(started_at),
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
