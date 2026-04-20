from __future__ import annotations

from typing import Protocol

from context.memory.core.schema import MemoryContext


class LongTermMemory(Protocol):
    async def load_memory_context(
        self,
        *,
        user_id: int,
        session_id: int,
        kb_id: int,
        query: str,
        recent_messages: list[dict[str, str]],
    ) -> MemoryContext: ...


class OrchestratorLongTermMemoryAdapter:
    """Compatibility adapter that preserves legacy orchestrator load behavior."""

    def __init__(self, memory_orchestrator) -> None:
        self._memory_orchestrator = memory_orchestrator

    async def load_memory_context(
        self,
        *,
        user_id: int,
        session_id: int,
        kb_id: int,
        query: str,
        recent_messages: list[dict[str, str]],
    ) -> MemoryContext:
        return await self._memory_orchestrator.load(
            user_id=user_id,
            session_id=session_id,
            kb_id=kb_id,
            query=query,
            recent_messages=recent_messages,
        )