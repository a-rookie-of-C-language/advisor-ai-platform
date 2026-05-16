from __future__ import annotations

from typing import AsyncIterator, Protocol

from query_engine.EngineContext import EngineContext


class EngineStrategy(Protocol):
    async def run(self, context: EngineContext) -> AsyncIterator[str]:
        ...
