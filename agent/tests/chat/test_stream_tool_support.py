from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from chat.stream_tool_support import ChatStreamToolSupport


class _FakeTools:
    def __init__(self, output: str) -> None:
        self.output = output
        self.calls: list[tuple[str, dict, dict]] = []

    def get(self, name: str):
        _ = name
        return None

    async def execute(self, name: str, args: dict, context: dict) -> str:
        self.calls.append((name, args, context))
        return self.output


class _FakeSearchSubAgent:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    async def search(self, query: str, *, max_results: int):
        self.calls.append((query, max_results))
        return SimpleNamespace(
            safe=True,
            summary="命中的摘要",
            sources=[{"title": "来源标题", "url": "https://example.com"}],
        )


def _build_support(tools: _FakeTools) -> ChatStreamToolSupport:
    return ChatStreamToolSupport(
        tools=tools,
        tool_permission=None,
        web_search_provider_factory=lambda: None,
        web_fetch_provider_factory=lambda: None,
    )


@pytest.mark.asyncio
async def test_web_fetch_miss_falls_back_to_web_search_subagent() -> None:
    tools = _FakeTools(
        json.dumps(
            {
                "ok": False,
                "status": "miss",
                "message": "no content",
                "items": [],
            }
        )
    )
    support = _build_support(tools)
    support.web_search_subagent = _FakeSearchSubAgent()

    raw = await support.execute_tool(
        "web_fetch",
        {"url": "https://example.com/page"},
        user_id=1,
        session_id=2,
        user_query="用户问题",
    )

    payload = json.loads(raw)
    assert payload["ok"] is True
    assert payload["status"] == "hit"
    assert payload["items"][0]["title"] == "来源标题"
    assert support.web_search_subagent.calls == [("https://example.com/page", 5)]
    assert tools.calls[0][2]["user_id"] == 1


@pytest.mark.asyncio
async def test_tool_exception_returns_protocol_error_payload() -> None:
    class _BrokenTools(_FakeTools):
        async def execute(self, name: str, args: dict, context: dict) -> str:
            _ = name
            _ = args
            _ = context
            raise RuntimeError("boom")

    support = _build_support(_BrokenTools("{}"))

    raw = await support.execute_tool(
        "memory_read",
        {"query": "q"},
        user_id=None,
        session_id=None,
        user_query="q",
    )

    payload = json.loads(raw)
    assert payload == {
        "ok": False,
        "status": "error",
        "message": "tool_execute_failed",
        "items": [],
    }
