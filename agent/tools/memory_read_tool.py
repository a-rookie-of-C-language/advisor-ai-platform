from __future__ import annotations

from pydantic import BaseModel, Field

from agent.context.memory.api.memory_api_client import MemoryApiClient
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult


class MemoryReadInput(BaseModel):
    query: str | None = None
    top_k: int = Field(default=5, ge=1, le=10)


class MemoryReadTool(BaseTool[MemoryReadInput, BaseModel]):
    def __init__(self, memory_client: MemoryApiClient) -> None:
        super().__init__(
            name="memory_read",
            description="Search long-term memory items by user query.",
            input_model=MemoryReadInput,
            required_permissions={ToolPermission.MEMORY_READ},
        )
        self._memory_client = memory_client
        self._is_concurrency_safe = True
        self._is_destructive = False
        self._is_read_only = True
        self._permission_matcher = "memory.read"
        self._should_defer = True
        self._always_load = False
        self._interrupt_behavior = "block"
        self._requires_user_interaction = False

    async def execute(self, tool_input: MemoryReadInput, context: dict[str, object]) -> ToolResult:
        user_id = context.get("user_id")
        kb_id = context.get("kb_id")
        user_query = str(context.get("user_query") or "").strip()

        if user_id is None:
            return ToolResult.error("memory_read missing user_id")
        if kb_id is None or int(kb_id) < 0:
            return ToolResult.error("memory_read invalid kb_id")

        query = str(tool_input.query or user_query).strip()
        if not query:
            return ToolResult.error("memory_read empty query")

        try:
            items = await self._memory_client.search_long_term(
                user_id=int(user_id),
                kb_id=int(kb_id),
                query=query,
                top_k=tool_input.top_k,
            )
            payload = [
                {
                    "id": item.id,
                    "content": item.content,
                    "confidence": item.confidence,
                    "score": item.score,
                    "tags": item.tags,
                }
                for item in items
            ]
            if payload:
                return ToolResult(ok=True, status="hit", message="hit", items=payload)
            return ToolResult(ok=True, status="miss", message="miss", items=[])
        except Exception as exc:
            return ToolResult.error(f"memory_read_exception: {exc}")
