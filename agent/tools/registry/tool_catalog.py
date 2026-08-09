from __future__ import annotations

import os

from context.memory.api.memory_api_client import MemoryApiClient
from RAG.RAG_service import RAG_service
from tools.core.base_tool import BaseTool
from tools.memory_read import MemoryReadTool
from tools.memory_write import MemoryWriteTool
from tools.rag_search import RAGSearchTool
from tools.web_fetch import WebFetchTool
from tools.web_search import WebSearchTool
from tools.workspace import WorkspaceManager
from tools.workspace.workspace_create_dir_tool import WorkspaceCreateDirTool
from tools.workspace.workspace_edit_tool import WorkspaceEditTool
from tools.workspace.workspace_list_tool import WorkspaceListTool
from tools.workspace.workspace_read_tool import WorkspaceReadTool
from tools.workspace.workspace_write_tool import WorkspaceWriteTool


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
        rag_service: RAG_service | None,
        memory_client: MemoryApiClient | None,
    ) -> list[BaseTool]:
        tools: list[BaseTool] = []
        if rag_service is not None:
            tools.append(RAGSearchTool(rag_service))
        if memory_client is not None and cls._feature_enabled("MEMORY_TOOLS", True):
            tools.append(MemoryReadTool(memory_client))
            tools.append(MemoryWriteTool(memory_client))
        if cls._feature_enabled("WEB_SEARCH", True):
            tools.append(WebSearchTool())
        if cls._feature_enabled("WEB_FETCH", True):
            tools.append(WebFetchTool())
        return tools

    @classmethod
    def get_custom_tools(
        cls,
        *,
        rag_service: RAG_service | None,
        memory_client: MemoryApiClient | None,
    ) -> list[BaseTool]:
        _ = rag_service
        _ = memory_client
        tools: list[BaseTool] = []
        if cls._feature_enabled("WORKSPACE_TOOLS", True):
            workspace_manager = WorkspaceManager()
            tools.append(WorkspaceReadTool(workspace_manager))
            tools.append(WorkspaceWriteTool(workspace_manager))
            tools.append(WorkspaceEditTool(workspace_manager))
            tools.append(WorkspaceListTool(workspace_manager))
            tools.append(WorkspaceCreateDirTool(workspace_manager))
        return tools

    @classmethod
    async def get_mcp_tools(
        cls,
        *,
        rag_service: RAG_service | None = None,
        memory_client: MemoryApiClient | None = None,
    ) -> list[BaseTool]:
        _ = rag_service
        _ = memory_client
        if not cls._feature_enabled("MCP_TOOLS", False):
            return []
        try:
            from tools.mcp.loader.mcp_tool_loader import load_mcp_tools

            return await load_mcp_tools()
        except Exception:
            return []

    @classmethod
    async def get_all_base_tools(
        cls,
        *,
        rag_service: RAG_service | None = None,
        memory_client: MemoryApiClient | None = None,
    ) -> list[BaseTool]:
        tools: list[BaseTool] = []
        tools.extend(cls.get_builtin_tools(rag_service=rag_service, memory_client=memory_client))
        tools.extend(cls.get_custom_tools(rag_service=rag_service, memory_client=memory_client))
        tools.extend(await cls.get_mcp_tools(rag_service=rag_service, memory_client=memory_client))
        return tools
