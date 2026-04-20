from __future__ import annotations

import logging

from memory.api.memory_api_client import MemoryApiClient
from memory.core.governance import MemoryGovernance
from memory.core.schema import MemoryContext
from memory.pipeline.retrieval import MemoryRetrieval
from memory.pipeline.session_memory import SessionMemory
from memory.pipeline.work_memory import WorkMemory
from memory.pipeline.writeback import Extractor, MemoryWriteback

logger = logging.getLogger(__name__)


class MemoryOrchestrator:
    def __init__(
        self,
        api_client: MemoryApiClient,
        retrieval: MemoryRetrieval | None = None,
        writeback: MemoryWriteback | None = None,
        session_memory: SessionMemory | None = None,
        work_memory: WorkMemory | None = None,
        governance: MemoryGovernance | None = None,
    ) -> None:
        self._governance = governance or MemoryGovernance()
        self._api_client = api_client
        self._retrieval = retrieval or MemoryRetrieval(governance=self._governance)
        self._writeback = writeback or MemoryWriteback(governance=self._governance)
        self._session_memory = session_memory or SessionMemory(governance=self._governance)
        self._work_memory = work_memory or WorkMemory()

    @property
    def api_client(self) -> MemoryApiClient:
        return self._api_client

    async def load(
        self,
        user_id: int,
        session_id: int,
        kb_id: int,
        query: str,
        recent_messages: list[dict[str, str]],
    ) -> MemoryContext:
        short_term = self._session_memory.load_recent(recent_messages)
        long_term = await self._retrieval.retrieve(
            api_client=self._api_client,
            user_id=user_id,
            kb_id=kb_id,
            query=query,
            top_k=6,
        )
        summary = await self._api_client.get_session_summary(session_id)

        return self._work_memory.build_context(
            short_term=short_term,
            long_term=long_term,
            summary=summary,
        )

    async def flush(
        self,
        user_id: int,
        session_id: int,
        kb_id: int,
        user_text: str,
        assistant_text: str,
        recent_messages: list[dict[str, str]],
        source_turn_id: str | None = None,
    ) -> None:
        turn_id = source_turn_id or f"turn_{int(__import__('time').time())}"
        try:
            await self._api_client.submit_memory_task(
                user_id=user_id,
                kb_id=kb_id,
                session_id=session_id,
                turn_id=turn_id,
                user_text=user_text,
                assistant_text=assistant_text,
                recent_messages=recent_messages,
            )
        except Exception as exc:
            logger.warning("memory_task_submit_failed session=%s turn=%s err=%s", session_id, turn_id, exc)
