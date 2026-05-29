from __future__ import annotations

import asyncio
import logging

from pydantic import BaseModel

from json_types import JsonObject
from RAG.RAG_service import RAG_service
from RAG.schema import RAGSearchRequest, SearchMode
from tools.base_tool import BaseTool
from tools.rag_search.RAGSearchInput import RAGSearchInput
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult

logger = logging.getLogger(__name__)
_RAG_TOOL_TIMEOUT_SEC = 12.0


def _strip_surrogates(text: str) -> str:
    if not text:
        return text
    return "".join(ch for ch in text if not (0xD800 <= ord(ch) <= 0xDFFF))


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
        self._search_hint = "知识库,文档,资料,检索,查找"
        self._interrupt_behavior = "block"
        self._requires_user_interaction = False

    def get_semantic_keywords(self) -> list[str]:
        """返回语义关键词，用于意图路由匹配。"""
        return [
            "知识库",
            "文档",
            "资料",
            "检索",
            "查找",
            "RAG",
            "rag",
            "搜索",
            "查询",
            "问答",
            "政策",
            "规定",
            "制度",
        ]

    async def execute(self, tool_input: RAGSearchInput, context: JsonObject) -> ToolResult:
        user_id = context.get("user_id")
        session_id = context.get("session_id")
        user_query = str(context.get("user_query") or "").strip()

        if user_id is None or session_id is None:
            return ToolResult.error("tool permission check failed: missing user/session")

        query = _strip_surrogates(str(tool_input.query or user_query)).strip()
        if not query:
            return ToolResult.error("empty query")

        try:
            req = RAGSearchRequest(
                query=query,
                kb_id=0,
                top_k=tool_input.top_k,
                mode=SearchMode.dense,
                use_rerank=True,
            )
            result = await asyncio.wait_for(
                asyncio.to_thread(self._rag_service.rag_search, req),
                timeout=_RAG_TOOL_TIMEOUT_SEC,
            )
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
        except TimeoutError:
            logger.warning(
                "rag_search tool timeout: user_id=%s, session_id=%s, query=%s",
                user_id,
                session_id,
                query[:80],
            )
            return ToolResult.error("rag_search_timeout")
        except (RuntimeError, ValueError, OSError) as exc:
            logger.exception(
                "rag_search tool failed: user_id=%s, session_id=%s, error=%s",
                user_id,
                session_id,
                exc,
            )
            return ToolResult.error("rag_search_exception")
