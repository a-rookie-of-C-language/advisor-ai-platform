from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from llm.tool_spec import ToolSpec
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult


class ToolSearchInput(BaseModel):
    keywords: str = Field(..., min_length=1, description="空格分隔的搜索关键词")
    max_results: int = Field(default=3, ge=1, le=10)


class ToolSearchTool(BaseTool[ToolSearchInput, BaseModel]):
    """让模型按关键词搜索并发现延迟加载的工具。"""

    def __init__(self, specs_provider: Any) -> None:
        super().__init__(
            name="tool_search",
            description="按关键词搜索可用的延迟加载工具，获取其完整输入参数 schema。",
            input_model=ToolSearchInput,
            required_permissions={ToolPermission.LLM},
            category="meta",
        )
        self._specs_provider = specs_provider
        self._is_read_only = True
        self._is_concurrency_safe = True
        self._should_defer = False
        self._always_load = True
        self._search_hint = "工具,搜索,发现,加载"

    async def execute(self, tool_input: ToolSearchInput, context: dict[str, Any]) -> ToolResult:
        _ = context
        keywords = [kw.strip().lower() for kw in tool_input.keywords.split() if kw.strip()]
        if not keywords:
            return ToolResult.error("tool_search: empty keywords")

        candidates: list[ToolSpec] = self._specs_provider() if callable(self._specs_provider) else []
        scored: list[tuple[int, ToolSpec]] = []
        for spec in candidates:
            if spec.name == "tool_search":
                continue
            text = f"{spec.name} {spec.description} {spec.search_hint}".lower()
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                scored.append((score, spec))

        scored.sort(key=lambda item: item[0], reverse=True)
        top = scored[: tool_input.max_results]

        if not top:
            return ToolResult(
                ok=True,
                status="miss",
                message="未找到匹配的工具，尝试更换关键词",
                items=[],
            )

        items = []
        for _, spec in top:
            schema_text = (
                f"工具名称: {spec.name}\n"
                f"描述: {spec.description}\n"
                f"输入参数 (JSON Schema):\n{spec.parameters}"
            )
            items.append({
                "tool_name": spec.name,
                "description": spec.description,
                "parameters": spec.parameters,
                "schema_text": schema_text,
            })

        return ToolResult(
            ok=True,
            status="hit",
            message=f"找到 {len(items)} 个匹配工具",
            items=items,
        )
