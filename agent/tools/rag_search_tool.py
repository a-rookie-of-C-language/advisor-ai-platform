from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from RAG.RAG_service import RAG_service
from RAG.schema import RAGSearchRequest, SearchMode
from tools.base_tool import BaseTool

logger = logging.getLogger(__name__)


class RAGSearchTool(BaseTool):
    def __init__(self, rag_service: RAG_service) -> None:
        super().__init__(
            name="rag_search",
            description="Search relevant snippets from the selected knowledge base.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "User query"},
                    "top_k": {"type": "integer", "description": "Result count in range 1-10", "default": 5},
                },
                "required": ["query"],
            },
        )
        self._rag_service = rag_service

    async def execute(self, tool_args: dict[str, Any], context: dict[str, Any]) -> str:
        user_id = context.get("user_id")
        session_id = context.get("session_id")
        kb_id = context.get("kb_id")
        user_query = str(context.get("user_query") or "").strip()

        if user_id is None or session_id is None:
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "tool permission check failed: missing user/session",
                    "items": [],
                }
            )

        if kb_id is None or int(kb_id) < 0:
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "tool permission check failed: invalid kb_id",
                    "items": [],
                }
            )

        query = str(tool_args.get("query") or user_query).strip()
        if not query:
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "empty query",
                    "items": [],
                }
            )

        top_k_raw = tool_args.get("top_k", 5)
        try:
            top_k = max(1, min(int(top_k_raw), 10))
        except Exception:
            top_k = 5

        try:
            req = RAGSearchRequest(
                query=query,
                kb_id=int(kb_id),
                top_k=top_k,
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
                return json.dumps(
                    {
                        "ok": True,
                        "status": "hit",
                        "message": "hit",
                        "items": items,
                    }
                )

            if result.ok:
                return json.dumps(
                    {
                        "ok": True,
                        "status": "miss",
                        "message": "miss",
                        "items": [],
                    }
                )

            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "rag_search_failed",
                    "items": [],
                }
            )
        except Exception:
            logger.exception(
                "rag_search tool failed: user_id=%s, session_id=%s, kb_id=%s",
                user_id,
                session_id,
                kb_id,
            )
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "rag_search_exception",
                    "items": [],
                }
            )
