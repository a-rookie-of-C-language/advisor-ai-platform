from __future__ import annotations

from typing import AsyncIterator

from query_engine.EngineContext import EngineContext
from query_engine.EngineEvent import EngineEvent
from query_engine.EngineStrategy import EngineStrategy


class ConversationQueryEngine:
    def __init__(self, strategy: EngineStrategy) -> None:
        self._strategy = strategy

    async def query(self, context: EngineContext) -> AsyncIterator[str]:
        saw_done = False
        saw_error = False
        async for event in self._strategy.run(context):
            if event.event == "sys_done":
                saw_done = True
            if event.event == "sys_error":
                saw_error = True
            if event.trace_id is None:
                event = EngineEvent(
                    event=event.event,
                    source=event.source,
                    payload=event.payload,
                    trace_id=context.trace_id,
                    event_version=event.event_version,
                )
            yield event.to_sse()

        if not saw_done:
            finish_reason = "stream_finished_with_error" if saw_error else "stream_finished"
            yield EngineEvent.sys_done(finish_reason, trace_id=context.trace_id).to_sse()
