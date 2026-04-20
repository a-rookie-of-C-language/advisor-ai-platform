from __future__ import annotations

from typing import Any

import pytest

from agents.base.agent import Agent
from agents.memory.memory_worker import MemoryWorkerSubAgent
from tools.tool_permission import PermissionConfig, ToolPermission


class _FakeMemoryApiClient:
    def __init__(self) -> None:
        self.failed: list[tuple[int, str | None]] = []

    async def fetch_pending_tasks(self, limit: int = 10) -> list[dict[str, Any]]:
        return [
            {
                "id": 1,
                "sessionId": 100,
                "turnId": "t-1",
                "userId": 7,
                "kbId": 9,
                "payload": {
                    "user_text": "I like coffee.",
                    "assistant_text": "",
                    "recent_messages": [],
                },
            }
        ]

    async def upsert_candidates(self, user_id: int, kb_id: int, candidates: list[Any]) -> Any:
        return type("R", (), {"accepted": len(candidates), "rejected": 0})()

    async def save_session_summary(self, session_id: int, summary: str) -> None:
        return None

    async def mark_task_done(self, task_id: int) -> None:
        return None

    async def mark_task_failed(self, task_id: int, error: str | None = None) -> None:
        self.failed.append((task_id, error))


class _DummyAgent(Agent):
    async def run_once(self) -> dict[str, Any]:
        return {}

    async def run(self) -> None:
        return None


@pytest.mark.asyncio
async def test_agent_fetch_pending_tasks_requires_memory_read_permission() -> None:
    agent = _DummyAgent(name="dummy", memory_client=_FakeMemoryApiClient(), permission_config=PermissionConfig())
    with pytest.raises(PermissionError):
        await agent.fetch_pending_tasks(limit=1)


@pytest.mark.asyncio
async def test_agent_save_session_summary_requires_memory_write_resource() -> None:
    permission = PermissionConfig(
        allowed_tools={ToolPermission.MEMORY_WRITE},
        read_resources={"memory"},
        write_resources=set(),
    )
    agent = _DummyAgent(name="dummy", memory_client=_FakeMemoryApiClient(), permission_config=permission)
    with pytest.raises(PermissionError):
        await agent.save_session_summary(session_id=1, summary="s")


@pytest.mark.asyncio
async def test_memory_worker_permission_denied_marks_task_failed() -> None:
    client = _FakeMemoryApiClient()
    worker = MemoryWorkerSubAgent(api_client=client)  # type: ignore[arg-type]
    worker._permission = PermissionConfig(  # type: ignore[attr-defined]
        allowed_tools={ToolPermission.MEMORY_READ},
        read_resources={"context", "memory"},
        write_resources=set(),
    )

    stats = await worker.run_once()

    assert stats["fetched"] == 1
    assert stats["processed"] == 1
    assert stats["done"] == 0
    assert stats["failed"] == 1
    assert client.failed
    assert client.failed[0][0] == 1


def test_memory_worker_has_strict_memory_worker_permission_config() -> None:
    config = PermissionConfig.memory_worker()
    assert config.allows_tool(ToolPermission.MEMORY_READ)
    assert config.allows_tool(ToolPermission.MEMORY_WRITE)
    assert config.allows_write("memory")
