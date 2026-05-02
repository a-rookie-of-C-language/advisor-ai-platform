from __future__ import annotations

import os
from typing import Any

from tools.base_tool import BaseTool
from agent.tools.tool_impl.memory_read_tool import MemoryReadTool
from agent.tools.tool_impl.memory_write_tool import MemoryWriteTool
from agent.tools.tool_impl.rag_search_tool import RAGSearchTool


class ToolCatalog:
    """所有可注册工具的唯一真实来源。"""

    @staticmethod
    def _feature_enabled(name: str, default: bool = False) -> bool:
        raw = os.getenv(f"FEATURE_{name}", str(default)).strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @classmethod
    def get_builtin_tools(
        cls,
        *,
        rag_service: Any | None,
        memory_client: Any | None,
    ) -> list[BaseTool]:
        tools: list[BaseTool] = []
        if rag_service is not None:
            tools.append(RAGSearchTool(rag_service))
        if memory_client is not None and cls._feature_enabled("MEMORY_TOOLS", True):
            tools.append(MemoryReadTool(memory_client))
            tools.append(MemoryWriteTool(memory_client))
        return tools

    @classmethod
    def get_custom_tools(
        cls,
        *,
        rag_service: Any | None,
        memory_client: Any | None,
    ) -> list[BaseTool]:
        _ = rag_service
        _ = memory_client
        return []

    @classmethod
    def get_mcp_tools(
        cls,
        *,
        rag_service: Any | None,
        memory_client: Any | None,
    ) -> list[BaseTool]:
        _ = rag_service
        _ = memory_client
        return []

    @classmethod
    def get_all_base_tools(
        cls,
        *,
        rag_service: Any | None = None,
        memory_client: Any | None = None,
    ) -> list[BaseTool]:
        tools: list[BaseTool] = []
        tools.extend(cls.get_builtin_tools(rag_service=rag_service, memory_client=memory_client))
        tools.extend(cls.get_custom_tools(rag_service=rag_service, memory_client=memory_client))
        tools.extend(cls.get_mcp_tools(rag_service=rag_service, memory_client=memory_client))
        return tools
