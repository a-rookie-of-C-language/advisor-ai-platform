from __future__ import annotations

import json
import logging
from collections.abc import Callable

from agents.search import WebFetchSubAgent, WebSearchSubAgent
from chat.stream_tool_payloads import (
    dump_tool_error,
    dump_web_fetch_result,
    dump_web_search_result,
)
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from tools.permissions.tool_permission import PermissionConfig
from tools.registry.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)


class ChatStreamToolSupport:
    def __init__(
        self,
        *,
        tools: ToolRegistry,
        tool_permission: PermissionConfig,
        web_search_provider_factory: Callable[[], BaseLLMProvider],
        web_fetch_provider_factory: Callable[[], BaseLLMProvider],
    ) -> None:
        self._tools = tools
        self._tool_permission = tool_permission
        self._web_search_provider_factory = web_search_provider_factory
        self._web_fetch_provider_factory = web_fetch_provider_factory
        self.web_search_subagent = self._build_web_search_subagent()
        self.web_fetch_subagent = self._build_web_fetch_subagent()

    async def execute_tool(
        self,
        tool_name: str,
        tool_args: JsonObject,
        user_id: int | None,
        session_id: int | None,
        user_query: str,
        trace_id: str | None = None,
        turn_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> str:
        context: JsonObject = {
            "user_id": user_id,
            "session_id": session_id,
            "user_query": user_query,
            "trace_id": trace_id,
            "turn_id": turn_id,
            "permission_config": self._tool_permission,
        }
        if idempotency_key:
            context["idempotency_key"] = idempotency_key
        try:
            if tool_name == "web_fetch":
                return await self._execute_web_fetch_with_search_fallback(
                    tool_args,
                    context,
                    user_query=user_query,
                    session_id=session_id,
                    user_id=user_id,
                )
            if tool_name == "web_search" and self.web_search_subagent is not None:
                return await self._execute_web_search_via_subagent(tool_args)
            return await self._tools.execute(tool_name, tool_args, context)
        except Exception:
            logger.exception(
                "Tool execute failed: tool=%s, user_id=%s, session_id=%s",
                tool_name,
                user_id,
                session_id,
            )
            return dump_tool_error("tool_execute_failed")

    async def _execute_web_fetch_with_search_fallback(
        self,
        tool_args: JsonObject,
        context: JsonObject,
        *,
        user_query: str,
        session_id: int | None,
        user_id: int | None,
    ) -> str:
        try:
            fetch_result = (
                await self._execute_web_fetch_via_subagent(tool_args)
                if self.web_fetch_subagent is not None
                else await self._tools.execute("web_fetch", tool_args, context)
            )
        except Exception:
            fetch_result = dump_tool_error("web_fetch_exception")
        try:
            payload = json.loads(fetch_result)
        except Exception:
            payload = {}
        status = str(payload.get("status", "") or "")
        ok = bool(payload.get("ok", False))
        items = payload.get("items")
        has_items = isinstance(items, list) and bool(items)
        if ok and status == "hit" and has_items:
            return fetch_result
        if self.web_search_subagent is None:
            return fetch_result
        fallback_query = str(tool_args.get("url", "") or user_query).strip()
        if not fallback_query:
            return fetch_result
        logger.info(
            "tool_fallback web_fetch->web_search: session_id=%s, user_id=%s, query=%s",
            session_id,
            user_id,
            fallback_query[:120],
        )
        return await self._execute_web_search_via_subagent(
            {"query": fallback_query, "max_results": 5}
        )

    def _build_web_search_subagent(self) -> WebSearchSubAgent | None:
        web_search_tool = self._tools.get("web_search")
        if web_search_tool is None:
            return None
        return WebSearchSubAgent(
            llm_provider=self._web_search_provider_factory(),
            web_search_tool=web_search_tool,
        )

    async def _execute_web_search_via_subagent(self, tool_args: JsonObject) -> str:
        query = tool_args.get("query", "")
        max_results = tool_args.get("max_results", 5)
        result = await self.web_search_subagent.search(query, max_results=max_results)
        return dump_web_search_result(result)

    def _build_web_fetch_subagent(self) -> WebFetchSubAgent | None:
        web_fetch_tool = self._tools.get("web_fetch")
        if web_fetch_tool is None:
            return None
        return WebFetchSubAgent(
            llm_provider=self._web_fetch_provider_factory(),
            web_fetch_tool=web_fetch_tool,
        )

    async def _execute_web_fetch_via_subagent(self, tool_args: JsonObject) -> str:
        url = tool_args.get("url", "")
        max_content_length = tool_args.get("max_content_length", 2000)
        result = await self.web_fetch_subagent.fetch(
            url,
            max_content_length=max_content_length,
        )
        return dump_web_fetch_result(result)
