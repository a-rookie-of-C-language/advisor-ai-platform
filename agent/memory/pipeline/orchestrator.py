from __future__ import annotations

from memory.api.memory_api_client import MemoryApiClient
from memory.core.schema import MemoryContext
from memory.pipeline.retrieval import MemoryRetrieval
from memory.pipeline.session_memory import SessionMemory
from memory.pipeline.work_memory import WorkMemory
from memory.pipeline.writeback import MemoryWriteback


class MemoryOrchestrator:
    def __init__(
        self,
        api_client: MemoryApiClient,
        retrieval: MemoryRetrieval | None = None,
        writeback: MemoryWriteback | None = None,
        session_memory: SessionMemory | None = None,
        work_memory: WorkMemory | None = None,
    ) -> None:
        self._api_client = api_client
        self._retrieval = retrieval or MemoryRetrieval()
        self._writeback = writeback or MemoryWriteback()
        self._session_memory = session_memory or SessionMemory()
        self._work_memory = work_memory or WorkMemory()

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
        candidates = self._writeback.extract_candidates(
            user_text=user_text,
            assistant_text=assistant_text,
            source_turn_id=source_turn_id,
        )
        await self._writeback.flush(
            api_client=self._api_client,
            user_id=user_id,
            kb_id=kb_id,
            candidates=candidates,
        )

        if self._session_memory.should_summarize(recent_messages):
            summary_input = self._session_memory.build_summary_input(recent_messages)
            await self._api_client.save_session_summary(session_id=session_id, summary=summary_input)
