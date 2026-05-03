from __future__ import annotations

import json

import pytest
from pydantic import BaseModel

from context.memory.core.schema import MemoryCandidate, MemoryItem, WritebackResult
from tools.base_tool import BaseTool
from tools.tool_impl.memory_read_tool import MemoryReadTool
from tools.tool_impl.memory_write_tool import MemoryWriteTool
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
        {"permission_config": PermissionConfig(
            tool_modes={}, default_mode="deny", read_resources=set(), write_resources=set(),
        )},
    )
    body = json.loads(payload)
    assert body["ok"] is False
    assert body["status"] == "denied"
    assert body["meta"]["loading"]["should_defer"] is True
    assert body["meta"]["loading"]["always_load"] is False
    assert body["meta"]["feature"]["is_enabled"] is True
    assert body["meta"]["execution"]["is_concurrency_safe"] is False
    assert body["meta"]["execution"]["is_destructive"] is False
    assert body["meta"]["execution"]["is_read_only"] is False
    assert body["meta"]["execution"]["interrupt_behavior"] == "block"
    assert body["meta"]["execution"]["requires_user_interaction"] is False
    assert body["meta"]["permission_matcher"] == "dummy"


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
            "permission_config": PermissionConfig.from_allowed_tools(
                {ToolPermission.MEMORY_READ},
                read_resources={"memory"},
                write_resources=set(),
            ),
        },
    )
    body = json.loads(payload)
    assert body["ok"] is True
    assert body["status"] == "hit"
    assert body["items"]
    assert body["meta"]["loading"]["should_defer"] is True
    assert body["meta"]["loading"]["always_load"] is False
    assert body["meta"]["feature"]["is_enabled"] is True
    assert body["meta"]["execution"]["is_concurrency_safe"] is True
    assert body["meta"]["execution"]["is_destructive"] is False
    assert body["meta"]["execution"]["is_read_only"] is True
    assert body["meta"]["execution"]["interrupt_behavior"] == "block"
    assert body["meta"]["execution"]["requires_user_interaction"] is False
    assert body["meta"]["permission_matcher"] == "memory.read"


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
            "permission_config": PermissionConfig.from_allowed_tools(
                {ToolPermission.MEMORY_WRITE},
                read_resources=set(),
                write_resources={"memory"},
            ),
        },
    )
    body = json.loads(payload)
    assert body["ok"] is True
    assert body["status"] == "ok"
    assert body["meta"]["accepted"] == 1
    assert body["meta"]["loading"]["should_defer"] is True
    assert body["meta"]["loading"]["always_load"] is False
    assert body["meta"]["feature"]["is_enabled"] is True
    assert body["meta"]["execution"]["is_concurrency_safe"] is False
    assert body["meta"]["execution"]["is_destructive"] is True
    assert body["meta"]["execution"]["is_read_only"] is False
    assert body["meta"]["execution"]["interrupt_behavior"] == "cancel"
    assert body["meta"]["execution"]["requires_user_interaction"] is False
    assert body["meta"]["permission_matcher"] == "memory.write"
    assert client.last_upsert_count == 1


@pytest.mark.asyncio
async def test_tool_registry_returns_tool_disabled_when_feature_off() -> None:
    registry = ToolRegistry()
    tool = _DummyTool()
    tool._is_enabled = False
    registry.register(tool)
    payload = await registry.execute("dummy", {"text": "x"}, {})
    body = json.loads(payload)
    assert body["ok"] is False
    assert body["status"] == "denied"
    assert body["message"] == "tool_disabled"


@pytest.mark.asyncio
async def test_tool_registry_returns_error_on_loading_conflict() -> None:
    registry = ToolRegistry()
    tool = _DummyTool()
    tool._always_load = True
    tool._should_defer = True
    registry.register(tool)
    payload = await registry.execute("dummy", {"text": "x"}, {})
    body = json.loads(payload)
    assert body["ok"] is False
    assert body["status"] == "error"
    assert body["message"] == "tool_configuration_invalid"
    assert body["meta"]["errors"]
