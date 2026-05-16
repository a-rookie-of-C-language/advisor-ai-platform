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
        async for serialized_event in self._strategy.run(context):
            if serialized_event.startswith("event: sys_done"):
                saw_done = True
            if serialized_event.startswith("event: sys_error"):
                saw_error = True
            yield serialized_event

        if not saw_done:
            finish_reason = "stream_finished_with_error" if saw_error else "stream_finished"
            yield EngineEvent(
                event="sys_done",
                source="system",
                payload={"finish_reason": finish_reason},
                trace_id=context.trace_id,
            ).to_sse()
