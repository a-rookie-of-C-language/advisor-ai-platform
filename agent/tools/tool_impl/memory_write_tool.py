from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.core.schema import MemoryCandidate
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult


class MemoryCandidateInput(BaseModel):
    content: str = Field(min_length=1)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    source_turn_id: str | None = None
    tags: dict[str, Any] = Field(default_factory=dict)


class MemoryWriteInput(BaseModel):
    candidates: list[MemoryCandidateInput] = Field(min_length=1)


class MemoryWriteTool(BaseTool[MemoryWriteInput, BaseModel]):
    def __init__(self, memory_client: MemoryApiClient) -> None:
        super().__init__(
            name="memory_write",
            description="Write memory candidates into long-term memory.",
            input_model=MemoryWriteInput,
            required_permissions={ToolPermission.MEMORY_WRITE},
        )
        self._memory_client = memory_client
        self._is_concurrency_safe = False
        self._is_destructive = True
        self._is_read_only = False
        self._permission_matcher = "memory.write"
        self._should_defer = True
        self._always_load = False
        self._interrupt_behavior = "cancel"
        self._requires_user_interaction = False

    async def execute(self, tool_input: MemoryWriteInput, context: dict[str, object]) -> ToolResult:
        user_id = context.get("user_id")
        kb_id = context.get("kb_id")

        if user_id is None:
            return ToolResult.error("memory_write missing user_id")
        if kb_id is None:
            return ToolResult.error("memory_write invalid kb_id")
        try:
            kb_id_int = int(kb_id)
        except (ValueError, TypeError):
            return ToolResult.error("memory_write invalid kb_id")
        if kb_id_int < 0:
            return ToolResult.error("memory_write invalid kb_id")

        candidates = [
            MemoryCandidate(
                content=item.content,
                confidence=item.confidence,
                source_turn_id=item.source_turn_id,
                tags=item.tags,
            )
            for item in tool_input.candidates
        ]

        try:
            result = await self._memory_client.upsert_candidates(
                user_id=int(user_id),
                kb_id=int(kb_id),
                candidates=candidates,
            )
            return ToolResult(
                ok=True,
                status="ok",
                message=result.message,
                items=[],
                meta={"accepted": result.accepted, "rejected": result.rejected},
            )
        except Exception as exc:  
            return ToolResult.error(f"memory_write_exception: {exc}")
