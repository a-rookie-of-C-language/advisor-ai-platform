from __future__ import annotations

import asyncio
import logging
import os
import time

from agent.json_types import JsonObject
from pydantic import BaseModel
from tavily import TavilyClient

from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult
from tools.web_search.web_search_input import WebSearchInput

logger = logging.getLogger(__name__)

_SEARCH_TOTAL_TIMEOUT_SEC = 8.0


class WebSearchTool(BaseTool[WebSearchInput, BaseModel]):
    def __init__(self) -> None:
        super().__init__(
            name="web_search",
            description="Search the web for real-time information using Tavily.",
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
        self._search_hint = "搜索,网络,实时,新闻,天气"
        self._interrupt_behavior = "block"
        self._requires_user_interaction = False
        self._api_key = os.getenv("TAVILY_API_KEY", "")

    async def execute(self, tool_input: WebSearchInput, context: JsonObject) -> ToolResult:
        _ = context
        query = tool_input.query.strip()
        if not query:
            return ToolResult.error("empty query")

        if not self._api_key:
            return ToolResult.error("TAVILY_API_KEY not configured")

        start_at = time.monotonic()
        try:
            remain = _SEARCH_TOTAL_TIMEOUT_SEC
            results = await asyncio.wait_for(
                asyncio.to_thread(self._search, query, tool_input.max_results),
                timeout=remain,
            )
            if results:
                return ToolResult(ok=True, status="hit", message="hit", items=results)
            return ToolResult(ok=True, status="miss", message="no results", items=[])
        except asyncio.TimeoutError:
            logger.warning(
                "web_search timeout: query=%s elapsed=%.2fs",
                query,
                time.monotonic() - start_at,
            )
            return ToolResult.error(f"web_search timeout after {_SEARCH_TOTAL_TIMEOUT_SEC}s")
        except Exception as exc:
            logger.warning(
                "web_search error: query=%s error=%s",
                query,
                str(exc),
            )
            return ToolResult.error(f"web_search error: {exc}")

    def _search(self, query: str, max_results: int) -> list[dict[str, str]]:
        client = TavilyClient(api_key=self._api_key)
        response = client.search(query, max_results=max_results)
        return [
            {
                "title": r.get("title", ""),
                "snippet": (r.get("content", "") or "")[:200],
                "url": r.get("url", ""),
                "source": "web",
            }
            for r in response.get("results", [])
        ]

    def get_query_patterns(self) -> list[str]:
        return [
            r"(?:最新|现在|今日|recent|latest|current|news|price|pricing)",
            r"(?:搜索|查一下|找一下|search|find|lookup)",
        ]

    def get_semantic_keywords(self) -> list[str]:
        return [
            "latest",
            "current",
            "recent",
            "news",
            "pricing",
            "搜索",
            "查一下",
            "找一下",
            "最新",
            "现在",
        ]
