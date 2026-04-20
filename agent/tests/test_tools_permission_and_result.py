from __future__ import annotations

import json

import pytest
from pydantic import BaseModel

from memory.core.schema import MemoryCandidate, MemoryItem, WritebackResult
from tools.base_tool import BaseTool
from tools.memory_read_tool import MemoryReadTool
from tools.memory_write_tool import MemoryWriteTool
from tools.tool_permission import PermissionConfig, ToolPermission
from tools.tool_registry import ToolRegistry
from tools.tool_result import ToolResult


class _DummyInput(BaseModel):
    text: str


class _DummyTool(BaseTool[_DummyInput, BaseModel]):
    def __init__(self) -> None:
        super().__init__(
            name="dummy",
            description="dummy",
            input_model=_DummyInput,
            required_permissions={ToolPermission.RAG_READ},
        )

    async def execute(self, tool_input: _DummyInput, context: dict[str, object]) -> ToolResult:
        _ = tool_input
        _ = context
        return ToolResult(ok=True, status="ok", message="ok", items=[])


class _FakeMemoryClient:
    def __init__(self) -> None:
        self.last_upsert_count = 0

    async def search_long_term(self, user_id: int, kb_id: int, query: str, top_k: int) -> list[MemoryItem]:
        _ = user_id
        _ = kb_id
        _ = query
        _ = top_k
        return [MemoryItem(id=1, user_id=1, kb_id=1, content="记忆", confidence=0.9, score=0.8)]

    async def upsert_candidates(
        self, user_id: int, kb_id: int, candidates: list[MemoryCandidate]
    ) -> WritebackResult:
        _ = user_id
        _ = kb_id
        self.last_upsert_count = len(candidates)
        return WritebackResult(accepted=len(candidates), rejected=0, message="ok")


@pytest.mark.asyncio
async def test_tool_registry_validation_error_before_permission_check() -> None:
    registry = ToolRegistry()
    registry.register(_DummyTool())
    payload = await registry.execute("dummy", {}, {})
    body = json.loads(payload)
    assert body["ok"] is False
    assert body["status"] == "error"
    assert body["message"] == "tool_input_validation_failed"
    assert body["meta"]["errors"]


@pytest.mark.asyncio
async def test_tool_registry_denies_without_permission() -> None:
    registry = ToolRegistry()
    registry.register(_DummyTool())
    payload = await registry.execute(
        "dummy",
        {"text": "x"},
        {"permission_config": PermissionConfig(allowed_tools=set(), read_resources=set(), write_resources=set())},
    )
    body = json.loads(payload)
    assert body["ok"] is False
    assert body["status"] == "denied"


@pytest.mark.asyncio
async def test_memory_read_tool_returns_hit() -> None:
    registry = ToolRegistry()
    registry.register(MemoryReadTool(memory_client=_FakeMemoryClient()))  # type: ignore[arg-type]
    payload = await registry.execute(
        "memory_read",
        {"query": "q"},
        {
            "user_id": 1,
            "kb_id": 2,
            "user_query": "q",
            "permission_config": PermissionConfig(
                allowed_tools={ToolPermission.MEMORY_READ},
                read_resources={"memory"},
                write_resources=set(),
            ),
        },
    )
    body = json.loads(payload)
    assert body["ok"] is True
    assert body["status"] == "hit"
    assert body["items"]


@pytest.mark.asyncio
async def test_memory_write_tool_returns_meta() -> None:
    client = _FakeMemoryClient()
    registry = ToolRegistry()
    registry.register(MemoryWriteTool(memory_client=client))  # type: ignore[arg-type]
    payload = await registry.execute(
        "memory_write",
        {"candidates": [{"content": "喜欢咖啡", "confidence": 0.8}]},
        {
            "user_id": 1,
            "kb_id": 2,
            "permission_config": PermissionConfig(
                allowed_tools={ToolPermission.MEMORY_WRITE},
                read_resources=set(),
                write_resources={"memory"},
            ),
        },
    )
    body = json.loads(payload)
    assert body["ok"] is True
    assert body["status"] == "ok"
    assert body["meta"]["accepted"] == 1
    assert client.last_upsert_count == 1

