from __future__ import annotations

from typing import AsyncIterator

import pytest

from query_engine.ConversationQueryEngine import ConversationQueryEngine
from query_engine.EngineContext import EngineContext
from query_engine.EngineEvent import EngineEvent


class _NoDoneStrategy:
    async def run(self, context: EngineContext) -> AsyncIterator[EngineEvent]:
        _ = context
        yield EngineEvent.llm_delta("hello")


class _WithDoneStrategy:
    async def run(self, context: EngineContext) -> AsyncIterator[EngineEvent]:
        _ = context
        yield EngineEvent.llm_delta("hello")
        yield EngineEvent.sys_done("stream_finished")


class _ErrorNoDoneStrategy:
    async def run(self, context: EngineContext) -> AsyncIterator[EngineEvent]:
        _ = context
        yield EngineEvent.sys_error(code="x", message="boom", retryable=False)


@pytest.mark.asyncio
async def test_query_engine_appends_done_when_missing() -> None:
    engine = ConversationQueryEngine(_NoDoneStrategy())
    context = EngineContext(messages=[])

    events = [event async for event in engine.query(context)]

    assert len(events) == 2
    assert events[0].startswith("event: llm_delta")
    assert events[1].startswith("event: sys_done")
    assert '"finish_reason": "stream_finished"' in events[1]


@pytest.mark.asyncio
async def test_query_engine_keeps_single_done() -> None:
    engine = ConversationQueryEngine(_WithDoneStrategy())
    context = EngineContext(messages=[])

    events = [event async for event in engine.query(context)]

    assert len(events) == 2
    assert [event for event in events if event.startswith("event: sys_done")] == [events[1]]


@pytest.mark.asyncio
async def test_query_engine_error_path_done_reason() -> None:
    engine = ConversationQueryEngine(_ErrorNoDoneStrategy())
    context = EngineContext(messages=[])

    events = [event async for event in engine.query(context)]

    assert len(events) == 2
    assert events[0].startswith("event: sys_error")
    assert events[1].startswith("event: sys_done")
    assert '"finish_reason": "stream_finished_with_error"' in events[1]
