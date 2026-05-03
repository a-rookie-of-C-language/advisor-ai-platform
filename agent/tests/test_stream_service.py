from __future__ import annotations

import json
from typing import AsyncIterator, Iterable

import pytest

from chat.stream_service import ChatStreamService
from context.memory.core.schema import MemoryContext
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.tool_spec import ToolSpec


def _parse_event(raw: str) -> tuple[str, dict]:
    lines = [line for line in raw.strip().split("\n") if line]
    event = "message"
    payload = {}
    for line in lines:
        if line.startswith("event:"):
            event = line.split(":", 1)[1].strip()
        if line.startswith("data:"):
            payload = json.loads(line.split(":", 1)[1].strip())
    return event, payload


class _ProviderOk:
    def __init__(self, chunks: list[str]) -> None:
        self._chunks = chunks
        self.last_messages: list[ChatMessage] = []

    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: object) -> AsyncIterator[str]:
        self.last_messages = list(messages)
        for chunk in self._chunks:
            yield chunk

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: object,
    ) -> AsyncIterator[LLMStreamEvent]:
        for chunk in self._chunks:
            yield LLMStreamEvent(type="delta", text=chunk)


class _ProviderError:
    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: object) -> AsyncIterator[str]:
        if False:
            yield ""
        raise RuntimeError("provider boom")

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: object,
    ) -> AsyncIterator[LLMStreamEvent]:
        raise RuntimeError("provider boom")


class _ProviderToolUse:
    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: object) -> AsyncIterator[str]:
        if False:
            yield ""
        return

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: object,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tools
        _ = max_tool_calls
        _ = max_tool_retries
        payload = await tool_executor("rag_search", {"query": "q", "top_k": 3})
        yield LLMStreamEvent(type="tool_result", tool_name="rag_search", tool_output=payload, attempt=1, success=True)
        yield LLMStreamEvent(type="delta", text="answer")


class _ProviderLegacyToolUse:
    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: object) -> AsyncIterator[str]:
        if False:
            yield ""
        return

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: object,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tools
        _ = max_tool_calls
        _ = max_tool_retries
        payload = await tool_executor("rag_search", {"query": "q", "top_k": 3})
        yield LLMStreamEvent(type="tool_result", tool_name="rag_search", tool_output=payload, attempt=1, success=True)
        yield LLMStreamEvent(type="delta", text="answer")


class _RagMiss:
    def rag_search(self, req):
        _ = req

        class _Res:
            ok = True
            items = []

        return _Res()


class _RagMustNotRun:
    def rag_search(self, req):
        _ = req
        raise AssertionError("rag_search should not run without permission context")


class _MemoryOkFlushError:
    def __init__(self) -> None:
        self.load_called = 0
        self.flush_called = 0

    async def load(self, **kwargs) -> MemoryContext:
        self.load_called += 1
        return MemoryContext()

    async def flush(self, **kwargs) -> None:
        self.flush_called += 1
        raise RuntimeError("flush failed")


class _MemoryLoadError:
    def __init__(self) -> None:
        self.load_called = 0
        self.flush_called = 0

    async def load(self, **kwargs) -> MemoryContext:
        self.load_called += 1
        raise RuntimeError("load failed")

    async def flush(self, **kwargs) -> None:
        self.flush_called += 1


@pytest.mark.asyncio
async def test_stream_success_done_and_flush_failure_not_interrupt() -> None:
    provider = _ProviderOk(["hello", " world"])
    memory = _MemoryOkFlushError()
    service = ChatStreamService(provider=provider, memory_orchestrator=memory)

    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=0)]
    parsed = [_parse_event(event) for event in events]
    event_names = [name for name, _ in parsed]

    assert event_names == ["start", "delta", "delta", "done"]
    assert memory.load_called == 1
    assert memory.flush_called == 1


@pytest.mark.asyncio
async def test_stream_memory_load_failure_degrades_without_breaking_chat() -> None:
    provider = _ProviderOk(["ok"])
    memory = _MemoryLoadError()
    service = ChatStreamService(provider=provider, memory_orchestrator=memory)

    messages = [ChatMessage(role="user", content="question")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=0)]
    parsed = [_parse_event(event) for event in events]
    event_names = [name for name, _ in parsed]

    assert event_names == ["start", "delta", "done"]
    assert memory.load_called == 1
    assert memory.flush_called == 1
    assert provider.last_messages[0].role == "user"
    assert provider.last_messages[0].content == "question"


@pytest.mark.asyncio
async def test_stream_provider_error_emits_error_then_done() -> None:
    service = ChatStreamService(provider=_ProviderError(), memory_orchestrator=None)

    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages)]
    parsed = [_parse_event(event) for event in events]
    event_names = [name for name, _ in parsed]

    assert event_names == ["start", "error", "done"]
    assert parsed[1][1]["message"] == "服务内部错误，请稍后重试"


@pytest.mark.asyncio
async def test_stream_tool_use_emits_sources_and_miss_status() -> None:
    service = ChatStreamService(
        provider=_ProviderToolUse(),
        memory_orchestrator=None,
        rag_service=_RagMiss(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [name for name, _ in parsed]

    assert event_names == ["start", "sources", "delta", "done"]
    assert parsed[1][1]["status"] == "miss"
    assert parsed[1][1]["items"] == []


@pytest.mark.asyncio
async def test_stream_tool_use_without_scope_returns_permission_error_and_continues() -> None:
    service = ChatStreamService(
        provider=_ProviderToolUse(),
        memory_orchestrator=None,
        rag_service=_RagMustNotRun(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [name for name, _ in parsed]

    assert event_names == ["start", "sources", "delta", "done"]
    assert parsed[1][1]["status"] == "error"
    assert parsed[1][1]["items"] == []


@pytest.mark.asyncio
async def test_stream_respects_enabled_tools_whitelist(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENABLED_TOOLS", "other_tool")
    service = ChatStreamService(
        provider=_ProviderOk(["fallback"]),
        memory_orchestrator=None,
        rag_service=_RagMustNotRun(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [name for name, _ in parsed]

    assert event_names == ["start", "delta", "done"]


@pytest.mark.asyncio
async def test_stream_can_fallback_to_legacy_when_langgraph_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("USE_LANGGRAPH", "false")
    service = ChatStreamService(
        provider=_ProviderLegacyToolUse(),
        memory_orchestrator=None,
        rag_service=_RagMiss(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [name for name, _ in parsed]

    assert event_names == ["start", "sources", "delta", "done"]


@pytest.mark.asyncio
async def test_graph_health_contains_context_compaction_stats() -> None:
    service = ChatStreamService(
        provider=_ProviderOk(["ok"]),
        memory_orchestrator=None,
        rag_service=None,
    )
    messages = [ChatMessage(role="user", content="hello context compaction")]
    _ = [event async for event in service.stream_events(messages)]

    health = service.get_graph_health()
    assert "context_compaction" in health
    stats = health["context_compaction"]
    assert "tokens_before" in stats
    assert "tokens_after" in stats
    assert "tokens_released" in stats
    assert "latency_ms" in stats
