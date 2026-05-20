from __future__ import annotations

from typing import AsyncIterator, Protocol

from query_engine.EngineContext import EngineContext
from query_engine.EngineEvent import EngineEvent


class EngineStrategy(Protocol):
    async def run(self, context: EngineContext) -> AsyncIterator[EngineEvent]:
        ...
