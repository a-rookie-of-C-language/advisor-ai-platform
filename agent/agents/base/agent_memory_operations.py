from __future__ import annotations

from collections.abc import Callable

from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.WritebackResult import WritebackResult
from json_types import JsonObject
from tools.permissions.tool_permission import ToolPermission


class AgentMemoryOperations:
    def __init__(
        self,
        *,
        memory_client: MemoryApiClient | None,
        ensure_can_tool: Callable[[ToolPermission], None],
        ensure_can_read: Callable[[str], None],
        ensure_can_write: Callable[[str], None],
    ) -> None:
        self._memory_client = memory_client
        self._ensure_can_tool = ensure_can_tool
        self._ensure_can_read = ensure_can_read
        self._ensure_can_write = ensure_can_write

    async def fetch_pending_tasks(self, limit: int = 10) -> list[JsonObject]:
        self._ensure_can_tool(ToolPermission.MEMORY_READ)
        self._ensure_can_read("memory")
        return await self._require_client().fetch_pending_tasks(limit=limit)

    async def upsert_candidates(self, user_id: int, kb_id: int, candidates: list[MemoryCandidate]) -> WritebackResult:
        self._ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self._ensure_can_write("memory")
        return await self._require_client().upsert_candidates(user_id=user_id, kb_id=kb_id, candidates=candidates)

    async def save_session_summary(self, session_id: int, summary: str) -> None:
        self._ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self._ensure_can_write("memory")
        await self._require_client().save_session_summary(session_id=session_id, summary=summary)

    async def mark_task_done(self, task_id: int) -> None:
        self._ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self._ensure_can_write("memory")
        await self._require_client().mark_task_done(task_id)

    async def mark_task_failed(self, task_id: int, error: str | None = None) -> None:
        self._ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self._ensure_can_write("memory")
        await self._require_client().mark_task_failed(task_id, error)

    def _require_client(self) -> MemoryApiClient:
        if self._memory_client is None:
            raise RuntimeError("no_memory_client")
        return self._memory_client
