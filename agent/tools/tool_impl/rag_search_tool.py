from __future__ import annotations

import asyncio
import logging

from pydantic import BaseModel, Field

from RAG.RAG_service import RAG_service
from RAG.schema import RAGSearchRequest, SearchMode
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult

logger = logging.getLogger(__name__)


class RAGSearchInput(BaseModel):
    query: str | None = None
    top_k: int = Field(default=5, ge=1, le=10)


class RAGSearchTool(BaseTool[RAGSearchInput, BaseModel]):
    def __init__(self, rag_service: RAG_service) -> None:
        super().__init__(
            name="rag_search",
            description="Search relevant snippets from the selected knowledge base.",
            input_model=RAGSearchInput,
            required_permissions={ToolPermission.RAG_READ},
            category="retrieval",
        )
        self._rag_service = rag_service
        self._is_concurrency_safe = True
        self._is_destructive = False
        self._is_read_only = True
        self._permission_matcher = "rag.read"
        self._always_load = True
        self._should_defer = False
        self._interrupt_behavior = "block"
        self._requires_user_interaction = False

    async def execute(self, tool_input: RAGSearchInput, context: dict[str, object]) -> ToolResult:
        user_id = context.get("user_id")
        session_id = context.get("session_id")
        kb_id = context.get("kb_id")
        user_query = str(context.get("user_query") or "").strip()

        if user_id is None or session_id is None:
            return ToolResult.error("tool permission check failed: missing user/session")

        if kb_id is None:
            return ToolResult.error("tool permission check failed: invalid kb_id")
        try:
            kb_id_int = int(kb_id)
        except (ValueError, TypeError):
            return ToolResult.error("tool permission check failed: invalid kb_id")
        if kb_id_int < 0:
            return ToolResult.error("tool permission check failed: invalid kb_id")

        query = str(tool_input.query or user_query).strip()
        if not query:
            return ToolResult.error("empty query")

        try:
            req = RAGSearchRequest(
                query=query,
                kb_id=int(kb_id),
                top_k=tool_input.top_k,
                mode=SearchMode.dense,
                use_rerank=True,
            )
            result = await asyncio.to_thread(self._rag_service.rag_search, req)
            if result.ok and result.items:
                items = [
                    {
                        "id": hit.doc_id,
                        "docName": hit.doc_title,
                        "snippet": hit.text[:200],
                        "score": hit.score,
                    }
                    for hit in result.items
                ]
                return ToolResult(ok=True, status="hit", message="hit", items=items)

            if result.ok:
                return ToolResult(ok=True, status="miss", message="miss", items=[])

            return ToolResult.error("rag_search_failed")
        except Exception:  
            logger.exception(
                "rag_search tool failed: user_id=%s, session_id=%s, kb_id=%s",
                user_id,
                session_id,
                kb_id,
            )
            return ToolResult.error("rag_search_exception")
