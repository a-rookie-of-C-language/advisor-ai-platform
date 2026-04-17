from __future__ import annotations

import json
from typing import AsyncIterator, Iterable

import pytest

from chat.stream_service import ChatStreamService
from llm.base_provider import ChatMessage
from memory.core.schema import MemoryContext


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

    async def stream_chat(self, messages: Iterable[ChatMessage]) -> AsyncIterator[str]:
        self.last_messages = list(messages)
        for chunk in self._chunks:
            yield chunk


class _ProviderError:
    async def stream_chat(self, messages: Iterable[ChatMessage]) -> AsyncIterator[str]:
        if False:
            yield ""
        raise RuntimeError("provider boom")


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
    assert parsed[1][1]["message"] == "provider boom"

