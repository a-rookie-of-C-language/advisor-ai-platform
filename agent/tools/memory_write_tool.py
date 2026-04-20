from __future__ import annotations

from typing import Any

from memory.api.memory_api_client import MemoryApiClient
from memory.core.schema import MemoryCandidate
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult


class MemoryWriteTool(BaseTool):
    def __init__(self, memory_client: MemoryApiClient) -> None:
        super().__init__(
            name="memory_write",
            description="Write memory candidates into long-term memory.",
            parameters={
                "type": "object",
                "properties": {
                    "candidates": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "content": {"type": "string"},
                                "confidence": {"type": "number"},
                                "source_turn_id": {"type": "string"},
                                "tags": {"type": "object"},
                            },
                            "required": ["content"],
                        },
                    },
                },
                "required": ["candidates"],
            },
            required_permissions={ToolPermission.MEMORY_WRITE},
        )
        self._memory_client = memory_client

    async def execute(self, tool_args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        user_id = context.get("user_id")
        kb_id = context.get("kb_id")

        if user_id is None:
            return ToolResult.error("memory_write missing user_id")
        if kb_id is None or int(kb_id) < 0:
            return ToolResult.error("memory_write invalid kb_id")

        raw_candidates = tool_args.get("candidates")
        if not isinstance(raw_candidates, list) or not raw_candidates:
            return ToolResult.error("memory_write requires non-empty candidates")

        candidates: list[MemoryCandidate] = []
        for row in raw_candidates:
            if not isinstance(row, dict):
                continue
            content = str(row.get("content") or "").strip()
            if not content:
                continue
            confidence_raw = row.get("confidence", 0.5)
            try:
                confidence = float(confidence_raw)
            except Exception:
                confidence = 0.5
            confidence = min(max(confidence, 0.0), 1.0)
            source_turn_id = row.get("source_turn_id")
            source_turn_id = str(source_turn_id) if source_turn_id is not None else None
            tags = row.get("tags")
            if not isinstance(tags, dict):
                tags = {}
            candidates.append(
                MemoryCandidate(
                    content=content,
                    confidence=confidence,
                    source_turn_id=source_turn_id,
                    tags=tags,
                )
            )

        if not candidates:
            return ToolResult.error("memory_write has no valid candidates")

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

