from __future__ import annotations

from typing import Any, Literal

from tools.base_tool import BaseTool
from tools.tool_catalog import ToolCatalog

ConflictPolicy = Literal["keep_first", "keep_last", "error"]


class ToolAssemblyPool:
    """工具组装池：按 builtin -> custom -> mcp 顺序稳定组装并去重。"""

    @classmethod
    def build(
        cls,
        *,
        rag_service: Any | None = None,
        memory_client: Any | None = None,
        conflict_policy: ConflictPolicy = "keep_first",
    ) -> list[BaseTool]:
        builtin_tools = sorted(
            ToolCatalog.get_builtin_tools(
                rag_service=rag_service,
                memory_client=memory_client,
            ),
            key=lambda tool: tool.name,
        )
        custom_tools = sorted(
            ToolCatalog.get_custom_tools(
                rag_service=rag_service,
                memory_client=memory_client,
            ),
            key=lambda tool: tool.name,
        )
        mcp_tools = sorted(
            ToolCatalog.get_mcp_tools(
                rag_service=rag_service,
                memory_client=memory_client,
            ),
            key=lambda tool: tool.name,
        )
        ordered = builtin_tools + custom_tools + mcp_tools
        return cls._dedupe(ordered, conflict_policy=conflict_policy)

    @staticmethod
    def _dedupe(tools: list[BaseTool], *, conflict_policy: ConflictPolicy) -> list[BaseTool]:
        if conflict_policy not in {"keep_first", "keep_last", "error"}:
            raise ValueError(f"unsupported conflict policy: {conflict_policy}")

        resolved: list[BaseTool] = []
        name_to_idx: dict[str, int] = {}
        for tool in tools:
            current_idx = name_to_idx.get(tool.name)
            if current_idx is None:
                name_to_idx[tool.name] = len(resolved)
                resolved.append(tool)
                continue

            if conflict_policy == "keep_first":
                continue
            if conflict_policy == "keep_last":
                resolved[current_idx] = tool
                continue
            raise ValueError(f"duplicate tool name: {tool.name}")
        return resolved

