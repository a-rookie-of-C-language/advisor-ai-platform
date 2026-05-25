from __future__ import annotations

from typing import Protocol

from context.memory.core.MemoryContext import MemoryContext


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
