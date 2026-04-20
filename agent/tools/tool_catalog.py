from __future__ import annotations

import os
from typing import Any

from tools.base_tool import BaseTool
from tools.memory_read_tool import MemoryReadTool
from tools.memory_write_tool import MemoryWriteTool
from tools.rag_search_tool import RAGSearchTool


class ToolCatalog:
    """所有可注册工具的唯一真实来源。"""

    @staticmethod
    def _feature_enabled(name: str, default: bool = False) -> bool:
        raw = os.getenv(f"FEATURE_{name}", str(default)).strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @classmethod
    def _always_load_tools(
        cls,
        *,
        rag_service: Any | None,
    ) -> list[BaseTool]:
        tools: list[BaseTool] = []
        if rag_service is not None:
            tools.append(RAGSearchTool(rag_service))
        return tools

    @classmethod
    def _feature_gated_tools(
        cls,
        *,
        memory_client: Any | None,
    ) -> list[BaseTool]:
        tools: list[BaseTool] = []
        if memory_client is not None and cls._feature_enabled("MEMORY_TOOLS", True):
            tools.append(MemoryReadTool(memory_client))
            tools.append(MemoryWriteTool(memory_client))
        return tools

    @classmethod
    def get_all_base_tools(
        cls,
        *,
        rag_service: Any | None = None,
        memory_client: Any | None = None,
    ) -> list[BaseTool]:
        tools: list[BaseTool] = []
        tools.extend(cls._always_load_tools(rag_service=rag_service))
        tools.extend(cls._feature_gated_tools(memory_client=memory_client))
        return tools

