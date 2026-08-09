from __future__ import annotations

from typing import AsyncIterator, Callable

from query_engine.EngineContext import EngineContext
from query_engine.EngineEvent import EngineEvent
from query_engine.parse_sse_to_engine_event import parse_sse_to_engine_event


class GraphEngineStrategy:
    def __init__(self, stream_fn: Callable[..., AsyncIterator[str]]) -> None:
        self._stream_fn = stream_fn

    async def run(self, context: EngineContext) -> AsyncIterator[EngineEvent]:
        async for raw_event in self._stream_fn(
            context.messages,
            user_id=context.user_id,
            session_id=context.session_id,
            trace_id=context.trace_id,
            turn_id=context.turn_id,
        ):
            yield parse_sse_to_engine_event(raw_event)
