from __future__ import annotations

import asyncio

from tools.mcp.direct.DirectHttpMcpClient import DirectHttpMcpClient
from tools.mcp.config.mcp_config_parser import parse_stdio_env
from tools.mcp.protocol.McpClientProtocol import McpClientProtocol
from tools.mcp.config.McpServerConfig import McpServerConfig


class McpConnectionFactory:
    def __init__(
        self,
        *,
        local_semaphore: asyncio.Semaphore,
        remote_semaphore: asyncio.Semaphore,
    ) -> None:
        self._local_semaphore = local_semaphore
        self._remote_semaphore = remote_semaphore

    async def connect(self, config: McpServerConfig) -> McpClientProtocol:
        if config.transport_type == "stdio":
            return await self._connect_stdio(config)
        if config.transport_type == "http":
            return await self._connect_http(config)
        raise ValueError(f"Unsupported transport type: {config.transport_type}")

    def _get_semaphore(self, config: McpServerConfig) -> asyncio.Semaphore:
        return self._local_semaphore if config.transport_type == "stdio" else self._remote_semaphore

    async def _connect_stdio(self, config: McpServerConfig) -> McpClientProtocol:
        import importlib.util

        if importlib.util.find_spec("mcp") is None:
            raise ImportError("Please install mcp: pip install mcp")

        from mcp import ClientSession  # noqa: F401
        from mcp.client.stdio import stdio_client  # noqa: F401

        semaphore = self._get_semaphore(config)

        async with semaphore:
            parts = config.url_or_command.split()
            command = parts[0]
            args = parts[1:] if len(parts) > 1 else []

            async with stdio_client(
                command=command,
                args=args,
                env=parse_stdio_env(),
            ) as (read_stream, write_stream):
                client = ClientSession(read_stream, write_stream)
                await client.initialize()
                return client

    async def _connect_http(self, config: McpServerConfig) -> McpClientProtocol:
        import importlib.util

        if importlib.util.find_spec("mcp") is None:
            raise ImportError("Please install mcp: pip install mcp")

        from mcp import ClientSession  # noqa: F401

        semaphore = self._get_semaphore(config)

        async with semaphore:
            client = DirectHttpMcpClient(config)
            await client.initialize()
            return client
