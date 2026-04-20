from __future__ import annotations

from typing import Any

from memory.api.memory_api_client import MemoryApiClient
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult


class MemoryReadTool(BaseTool):
    def __init__(self, memory_client: MemoryApiClient) -> None:
        super().__init__(
            name="memory_read",
            description="Search long-term memory items by user query.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Memory query"},
                    "top_k": {"type": "integer", "description": "Result count in range 1-10", "default": 5},
                },
                "required": ["query"],
            },
            required_permissions={ToolPermission.MEMORY_READ},
        )
        self._memory_client = memory_client

    async def execute(self, tool_args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        user_id = context.get("user_id")
        kb_id = context.get("kb_id")
        user_query = str(context.get("user_query") or "").strip()

        if user_id is None:
            return ToolResult.error("memory_read missing user_id")
        if kb_id is None or int(kb_id) < 0:
            return ToolResult.error("memory_read invalid kb_id")

        query = str(tool_args.get("query") or user_query).strip()
        if not query:
            return ToolResult.error("memory_read empty query")

        top_k_raw = tool_args.get("top_k", 5)
        try:
            top_k = max(1, min(int(top_k_raw), 10))
        except Exception:
            top_k = 5

        try:
            items = await self._memory_client.search_long_term(
                user_id=int(user_id),
                kb_id=int(kb_id),
                query=query,
                top_k=top_k,
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

