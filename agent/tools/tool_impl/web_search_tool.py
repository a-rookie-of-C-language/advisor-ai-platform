from __future__ import annotations

import asyncio
import logging

from duckduckgo_search import DDGS
from pydantic import BaseModel

from tools.base_tool import BaseTool
from tools.tool_impl.web_search_input import WebSearchInput
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult

logger = logging.getLogger(__name__)


class WebSearchTool(BaseTool[WebSearchInput, BaseModel]):
    def __init__(self) -> None:
        super().__init__(
            name="web_search",
            description="Search the web for real-time information using DuckDuckGo.",
            input_model=WebSearchInput,
            required_permissions={ToolPermission.SEARCH},
            category="search",
        )
        self._is_concurrency_safe = True
        self._is_destructive = False
        self._is_read_only = True
        self._permission_matcher = "web.search"
        self._always_load = True
        self._should_defer = False
        self._interrupt_behavior = "block"
        self._requires_user_interaction = False

    async def execute(self, tool_input: WebSearchInput, context: dict[str, object]) -> ToolResult:
        _ = context
        query = tool_input.query.strip()
        if not query:
            return ToolResult.error("empty query")

        try:
            results = await asyncio.to_thread(self._search, query, tool_input.max_results)
            if results:
                return ToolResult(ok=True, status="hit", message="hit", items=results)
            return ToolResult(ok=True, status="miss", message="no results", items=[])
        except Exception:
            logger.exception("web_search failed: query=%s", query)
            return ToolResult.error("web_search_exception")

    @staticmethod
    def _search(query: str, max_results: int) -> list[dict[str, str]]:
        with DDGS() as ddgs:
            return [
                {
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "url": r.get("href", ""),
                    "source": "web",
                }
                for r in ddgs.text(query, max_results=max_results)
            ]
