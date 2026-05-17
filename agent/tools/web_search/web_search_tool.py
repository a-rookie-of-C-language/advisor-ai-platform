from __future__ import annotations

import asyncio
import logging
import time

from duckduckgo_search import DDGS
from duckduckgo_search.exceptions import DuckDuckGoSearchException, RatelimitException
from pydantic import BaseModel

from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult
from tools.web_search.web_search_input import WebSearchInput

logger = logging.getLogger(__name__)

_SEARCH_TOTAL_TIMEOUT_SEC = 8.0
_SEARCH_MAX_ATTEMPTS = 3
_SEARCH_BACKOFF_SEC = (0.35, 0.8)


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

        start_at = time.monotonic()
        try:
            last_error: Exception | None = None
            for attempt in range(1, _SEARCH_MAX_ATTEMPTS + 1):
                elapsed = time.monotonic() - start_at
                remain = _SEARCH_TOTAL_TIMEOUT_SEC - elapsed
                if remain <= 0:
                    logger.warning(
                        "web_search timeout before attempt: query=%s attempts=%s elapsed=%.2fs",
                        query,
                        attempt - 1,
                        elapsed,
                    )
                    break

                try:
                    results = await asyncio.wait_for(
                        asyncio.to_thread(self._search, query, tool_input.max_results),
                        timeout=remain,
                    )
                    if results:
                        return ToolResult(ok=True, status="hit", message="hit", items=results)
                    return ToolResult(ok=True, status="miss", message="no results", items=[])
                except RatelimitException as exc:
                    last_error = exc
                    if attempt >= _SEARCH_MAX_ATTEMPTS:
                        break
                    delay = _SEARCH_BACKOFF_SEC[min(attempt - 1, len(_SEARCH_BACKOFF_SEC) - 1)]
                    logger.warning(
                        "web_search ratelimited: query=%s attempt=%s/%s sleep=%.2fs",
                        query,
                        attempt,
                        _SEARCH_MAX_ATTEMPTS,
                        delay,
                    )
                    await asyncio.sleep(delay)
                except asyncio.TimeoutError as exc:
                    last_error = exc
                    logger.warning(
                        "web_search timeout: query=%s attempt=%s/%s total_elapsed=%.2fs",
                        query,
                        attempt,
                        _SEARCH_MAX_ATTEMPTS,
                        time.monotonic() - start_at,
                    )
                    break
                except DuckDuckGoSearchException as exc:
                    last_error = exc
                    logger.warning(
                        "web_search provider error: query=%s attempt=%s/%s error=%s",
                        query,
                        attempt,
                        _SEARCH_MAX_ATTEMPTS,
                        str(exc),
                    )
                    break

            return ToolResult.error(f"web_search failed after {_SEARCH_MAX_ATTEMPTS} attempts: {last_error}")
        except Exception as exc:
            logger.exception("web_search unexpected error: query=%s", query)
            return ToolResult.error(f"web_search exception: {exc}")

    @staticmethod
    def _search(query: str, max_results: int) -> list[dict[str, str]]:
        with DDGS() as ddgs:
            return [
                {
                    "title": r.get("title", ""),
                    "snippet": (r.get("body", "") or "")[:200],
                    "url": r.get("href", ""),
                    "source": "web",
                }
                for r in ddgs.text(query, max_results=max_results)
            ]
