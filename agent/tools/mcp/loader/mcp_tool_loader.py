from __future__ import annotations

import logging
from typing import cast

from tools.core.base_tool import BaseTool
from tools.mcp.client.mcp_client_pool import McpClientPool, McpServerConfig
from tools.mcp.loader.mcp_tool_adapter import McpToolAdapter
from tools.mcp.protocol.McpToolDescriptorProtocol import McpToolDescriptorProtocol
from tools.mcp.protocol.McpToolListResultProtocol import McpToolListResultProtocol

logger = logging.getLogger(__name__)


# 全局 MCP 客户端池实例
_mcp_client_pool: McpClientPool | None = None


def get_mcp_client_pool() -> McpClientPool:
    """获取全局 MCP 客户端池实例"""
    global _mcp_client_pool
    if _mcp_client_pool is None:
        _mcp_client_pool = McpClientPool()
    return _mcp_client_pool


def reset_mcp_client_pool() -> None:
    """重置全局 MCP 客户端池（用于测试）"""
    global _mcp_client_pool
    if _mcp_client_pool is not None:
        import asyncio

        asyncio.get_event_loop().run_until_complete(_mcp_client_pool.close())
        _mcp_client_pool = None


class McpToolLoader:
    """MCP 工具加载器

    特性：
    - 解析 .env 配置
    - 动态发现 MCP 工具
    - 连接失败跳过，继续加载其他服务器
    """

    def __init__(self) -> None:
        self._client_pool = get_mcp_client_pool()
        self._configs = McpClientPool.parse_env_config()

    @property
    def server_configs(self) -> list[McpServerConfig]:
        """获取所有配置的 MCP 服务器"""
        return self._configs

    async def load_tools(self) -> list[BaseTool]:
        """动态加载所有 MCP 服务器的工具

        每个服务器失败不影响其他服务器。
        """
        all_tools: list[BaseTool] = []

        for config in self._configs:
            try:
                tools = await self._load_tools_for_server(config)
                all_tools.extend(tools)
                logger.info(f"Loaded {len(tools)} MCP tools from: {config.name}")
            except Exception as e:
                logger.warning(f"Failed to load MCP tools from {config.name} (skip): {e}")

        return all_tools

    async def load_tools_for_server(self, server_name: str) -> list[BaseTool]:
        """加载指定 MCP 服务器的工具"""
        config = self._find_config(server_name)
        if config is None:
            logger.warning(f"MCP server not found: {server_name}")
            return []

        return await self._load_tools_for_server(config)

    async def _load_tools_for_server(self, config: McpServerConfig) -> list[BaseTool]:
        """加载单个 MCP 服务器的工具"""
        try:
            conn = await self._client_pool.get_connection(config)
        except Exception as e:
            logger.warning(f"MCP server connection failed: {config.name}, error: {e}")
            return []

        if conn.error:
            logger.warning(f"MCP server error: {config.name}, error: {conn.error}")
            return []

        client = conn.client
        if client is None:
            return []

        tools: list[BaseTool] = []

        try:
            # 调用 MCP 的 tools/list 获取工具列表
            result = cast(McpToolListResultProtocol, await client.list_tools())

            for mcp_tool in result.tools:
                tool = self._adapt_tool(config, mcp_tool)
                if tool:
                    tools.append(tool)

        except Exception as e:
            logger.error(f"Failed to list MCP tools from {config.name}: {e}")

        return tools

    def _adapt_tool(
        self, config: McpServerConfig, mcp_tool: McpToolDescriptorProtocol
    ) -> BaseTool | None:
        """将 MCP 工具适配为内部 BaseTool 格式"""
        try:
            # 获取工具元数据
            tool_name = mcp_tool.name
            description = getattr(mcp_tool, "description", "") or ""
            input_schema = getattr(mcp_tool, "inputSchema", {}) or {}

            # 处理 MCP annotations
            annotations = {}
            if hasattr(mcp_tool, "annotations"):
                ann = mcp_tool.annotations
                if ann:
                    annotations["readOnlyHint"] = getattr(ann, "readOnlyHint", False)
                    annotations["destructiveHint"] = getattr(ann, "destructiveHint", False)
                    annotations["openWorldHint"] = getattr(ann, "openWorldHint", False)

            # 处理 MCP meta
            if hasattr(mcp_tool, "_meta"):
                meta = mcp_tool._meta or {}
                if "anthropic/searchHint" in meta:
                    annotations["anthropic/searchHint"] = meta["anthropic/searchHint"]
                if "anthropic/alwaysLoad" in meta:
                    annotations["anthropic/alwaysLoad"] = meta["anthropic/alwaysLoad"]

            return McpToolAdapter(
                server_name=config.name,
                mcp_tool_name=tool_name,
                description=description,
                input_schema=input_schema,
                client_pool=self._client_pool,
                server_config=config,
                mcp_annotations=annotations,
            )

        except Exception as e:
            logger.warning(f"Failed to adapt MCP tool {getattr(mcp_tool, 'name', 'unknown')}: {e}")
            return None

    def _find_config(self, server_name: str) -> McpServerConfig | None:
        """根据服务器名称查找配置"""
        for config in self._configs:
            if config.name == server_name:
                return config
        return None


async def load_mcp_tools() -> list[BaseTool]:
    """便捷函数：加载所有 MCP 工具"""
    loader = McpToolLoader()
    return await loader.load_tools()
