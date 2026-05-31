from __future__ import annotations

import asyncio
import logging

import trafilatura
from pydantic import BaseModel

from json_types import JsonObject
from tools.core.base_tool import BaseTool
from tools.permissions.tool_permission import ToolPermission
from tools.core.tool_result import ToolResult
from tools.web_fetch.web_fetch_input import WebFetchInput

logger = logging.getLogger(__name__)

_FETCH_TIMEOUT_SEC = 10.0


class WebFetchTool(BaseTool[WebFetchInput, BaseModel]):
    def __init__(self) -> None:
        super().__init__(
            name="web_fetch",
            description="Fetch and extract clean article text from a URL using Trafilatura.",
            input_model=WebFetchInput,
            required_permissions={ToolPermission.SEARCH},
            category="search",
        )
        self._is_concurrency_safe = True
        self._is_destructive = False
        self._is_read_only = True
        self._permission_matcher = "web.fetch"
        self._always_load = True
        self._should_defer = False
        self._search_hint = "抓取,获取,网页,文章内容"
        self._interrupt_behavior = "block"
        self._requires_user_interaction = False

    async def execute(self, tool_input: WebFetchInput, context: JsonObject) -> ToolResult:
        _ = context
        url = tool_input.url.strip()
        if not url:
            return ToolResult.error("empty url")

        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self._fetch, url, tool_input.max_content_length),
                timeout=_FETCH_TIMEOUT_SEC,
            )
            if not result:
                return ToolResult(ok=True, status="miss", message="no content extracted", items=[])
            return ToolResult(ok=True, status="hit", message="content extracted", items=[result])
        except asyncio.TimeoutError:
            logger.warning("web_fetch timeout: url=%s", url)
            return ToolResult.error(f"web_fetch timeout after {_FETCH_TIMEOUT_SEC}s")
        except Exception as exc:
            logger.warning("web_fetch error: url=%s error=%s", url, str(exc))
            return ToolResult.error(f"web_fetch error: {exc}")

    @staticmethod
    def _fetch(url: str, max_length: int) -> dict[str, str]:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return {}

        extracted = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
        if not extracted:
            return {}

        text = extracted[:max_length]
        return {
            "url": url,
            "content": text,
            "source": "web",
        }

    def get_query_patterns(self) -> list[str]:
        return [
            r"https?://\\S+",
            r"(?:summarize|analyze|extract|read).*(?:https?://\\S+)",
            r"(?:总结|分析|提取|读取).*(?:https?://\\S+)",
        ]

    def get_semantic_keywords(self) -> list[str]:
        return [
            "http://",
            "https://",
            "url",
            "link",
            "网页",
            "页面",
            "文章",
            "pdf",
            "原文",
        ]
