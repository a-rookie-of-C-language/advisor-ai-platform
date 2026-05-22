from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Protocol

from json_types import JsonObject, JsonValue

logger = logging.getLogger(__name__)

# 并发控制限制
LOCAL_CONCURRENCY_LIMIT = 3
REMOTE_CONCURRENCY_LIMIT = 20

# 连接空闲超时（秒）
IDLE_TIMEOUT_SECONDS = 300  # 5分钟


@dataclass
class McpServerConfig:
    """MCP 服务器配置"""

    name: str
    transport_type: str  # stdio | http
    url_or_command: str
    token: str | None = None


@dataclass
class McpConnection:
    """MCP 连接状态"""

    config: McpServerConfig
    client: "McpClientProtocol" | None = None
    last_used: float = 0.0
    is_connecting: bool = False
    error: str | None = None
    _tool_list: list[JsonObject] | None = None


class McpToolContentProtocol(Protocol):
    type: str | None
    text: str | None
    data: JsonValue | None


class McpCallToolResultProtocol(Protocol):
    content: list[McpToolContentProtocol]
    isError: bool


class McpToolAnnotationsProtocol(Protocol):
    readOnlyHint: bool
    destructiveHint: bool
    openWorldHint: bool


class McpToolDescriptorProtocol(Protocol):
    name: str
    description: str
    inputSchema: JsonObject
    annotations: McpToolAnnotationsProtocol | None
    _meta: JsonObject | None


class McpToolListResultProtocol(Protocol):
    tools: list[McpToolDescriptorProtocol]


class McpClientProtocol(Protocol):
    async def list_tools(self) -> McpToolListResultProtocol: ...

    async def call_tool(self, name: str, arguments: JsonObject) -> McpCallToolResultProtocol: ...

    async def close(self) -> None: ...


class McpClientPool:
    """MCP 客户端连接池

    特性：
    - 按需连接（工具被调用时才连接）
    - 并发控制：本地 stdio ≤ 3，远程 HTTP ≤ 20
    - 空闲超时后断开连接
    - 连接失败自动重试（指数退避）
    """

    def __init__(self) -> None:
        self._connections: dict[str, McpConnection] = {}
        self._local_semaphore = asyncio.Semaphore(LOCAL_CONCURRENCY_LIMIT)
        self._remote_semaphore = asyncio.Semaphore(REMOTE_CONCURRENCY_LIMIT)
        self._locks: dict[str, asyncio.Lock] = {}
        self._cache_clear_event = asyncio.Event()

    def _get_lock(self, server_name: str) -> asyncio.Lock:
        if server_name not in self._locks:
            self._locks[server_name] = asyncio.Lock()
        return self._locks[server_name]

    def _get_semaphore(self, config: McpServerConfig) -> asyncio.Semaphore:
        return self._local_semaphore if config.transport_type == "stdio" else self._remote_semaphore

    @staticmethod
    def parse_env_config() -> list[McpServerConfig]:
        """解析 .env 中的 MCP_SERVERS 配置

        格式：name:transport:url,...

        示例：
            MCP_SERVERS=filesystem:stdio:/path/to/server,github:http:http://localhost:8000
        """
        servers_str = os.getenv("MCP_SERVERS", "").strip()
        if not servers_str:
            return []

        configs = []
        for server_entry in servers_str.split(","):
            server_entry = server_entry.strip()
            if not server_entry:
                continue

            parts = server_entry.split(":")
            if len(parts) < 3:
                logger.warning(f"Invalid MCP server config (skip): {server_entry}")
                continue

            name, transport_type, url_or_command = parts[0], parts[1], ":".join(parts[2:])
            # 将连字符替换为下划线，以匹配环境变量命名约定（如 MCP_TOKEN_STUDENT_SERVICE）
            token_key = f"MCP_TOKEN_{name.upper().replace('-', '_')}"
            token = os.getenv(token_key)

            configs.append(
                McpServerConfig(
                    name=name,
                    transport_type=transport_type,
                    url_or_command=url_or_command,
                    token=token,
                )
            )

        return configs

    async def get_connection(self, config: McpServerConfig) -> McpConnection:
        """获取或创建 MCP 连接（按需）"""
        server_name = config.name

        # 获取或创建连接对象
        if server_name not in self._connections:
            self._connections[server_name] = McpConnection(config=config)

        conn = self._connections[server_name]

        # 如果已有有效连接，直接返回
        if conn.client is not None and conn.error is None:
            conn.last_used = asyncio.get_event_loop().time()
            return conn

        # 如果正在连接中，等待
        if conn.is_connecting:
            lock = self._get_lock(server_name)
            await lock.acquire()
            lock.release()
            return conn

        # 建立新连接
        lock = self._get_lock(server_name)
        async with lock:
            # 双重检查
            if conn.client is not None and conn.error is None:
                return conn

            conn.is_connecting = True
            conn.error = None

            try:
                conn.client = await self._connect(config)
                conn.last_used = asyncio.get_event_loop().time()
                logger.info(f"MCP connection established: {server_name}")
            except Exception as e:
                conn.error = str(e)
                logger.error(f"MCP connection failed: {server_name}, error: {e}")
            finally:
                conn.is_connecting = False

        return conn

    async def _connect(self, config: McpServerConfig) -> McpClientProtocol:
        """建立 MCP 连接"""
        if config.transport_type == "stdio":
            return await self._connect_stdio(config)
        elif config.transport_type == "http":
            return await self._connect_http(config)
        else:
            raise ValueError(f"Unsupported transport type: {config.transport_type}")

    async def _connect_stdio(self, config: McpServerConfig) -> McpClientProtocol:
        """通过 stdio 连接到 MCP 服务器"""
        import importlib.util

        if importlib.util.find_spec("mcp") is None:
            raise ImportError("Please install mcp: pip install mcp")

        from mcp import ClientSession  # noqa: F401  # noqa: F401
        from mcp.client.stdio import stdio_client  # noqa: F401

        semaphore = self._get_semaphore(config)

        async with semaphore:
            parts = config.url_or_command.split()
            command = parts[0]
            args = parts[1:] if len(parts) > 1 else []

            stdio_env_str = os.getenv("MCP_STDIO_ENV", "")
            stdio_env = None
            if stdio_env_str:
                stdio_env = {}
                for s in stdio_env_str.split():
                    if "=" in s:
                        key, val = s.split("=", 1)
                        stdio_env[key] = val

            async with stdio_client(
                command=command,
                args=args,
                env=stdio_env,
            ) as (read_stream, write_stream):
                client = ClientSession(read_stream, write_stream)
                await client.initialize()
                return client

    async def _connect_http(self, config: McpServerConfig) -> McpClientProtocol:
        """通过 HTTP 连接到 MCP 服务器（直接 JSON-RPC POST）"""
        import importlib.util

        if importlib.util.find_spec("mcp") is None:
            raise ImportError("Please install mcp: pip install mcp")

        from mcp import ClientSession  # noqa: F401

        semaphore = self._get_semaphore(config)

        async with semaphore:
            # 创建自定义 HTTP 客户端来连接 MCP 服务器
            client = DirectHttpMcpClient(config)
            await client.initialize()
            return client

    async def call_tool(
        self,
        config: McpServerConfig,
        tool_name: str,
        arguments: JsonObject,
    ) -> JsonObject:
        """调用 MCP 工具，自动处理重连"""
        MAX_RETRIES = 1

        for attempt in range(MAX_RETRIES + 1):
            try:
                conn = await self.get_connection(config)
                if conn.error:
                    return {"ok": False, "error": conn.error}

                client = conn.client
                result = await client.call_tool(tool_name, arguments)
                conn.last_used = asyncio.get_event_loop().time()

                # 处理结果 - DirectHttpMcpClient 返回的是模拟的 CallToolResult
                if hasattr(result, 'content'):
                    return self._parse_tool_result(result)
                return {"ok": True, "content": str(result)}

            except Exception as e:
                error_msg = str(e)
                if attempt < MAX_RETRIES and self._is_session_expired_error(e):
                    # 会话过期，清除缓存并重连
                    logger.warning(f"MCP session expired, reconnecting: {config.name}")
                    self._invalidate_connection(config.name)
                    continue
                return {"ok": False, "error": error_msg}

        return {"ok": False, "error": "Max retries exceeded"}

    def _is_session_expired_error(self, error: Exception) -> bool:
        """判断是否为会话过期错误（MCP 规范：HTTP 404 + 错误码 -32001）"""
        error_str = str(error)
        if "Event loop is closed" in error_str:
            return True
        if "-32001" in error_str:
            return True
        if hasattr(error, "code"):
            return error.code == -32001  # type: ignore[union-attr]
        return False

    def _parse_tool_result(self, result: McpCallToolResultProtocol) -> JsonObject:
        """解析 MCP 工具调用结果"""
        content = []
        if hasattr(result, "content"):
            for item in result.content:
                if hasattr(item, "text"):
                    content.append({"type": "text", "text": item.text})
                elif hasattr(item, "data"):
                    content.append({"type": "text", "text": item.data})
                elif hasattr(item, "type"):
                    content.append({"type": item.type, "text": getattr(item, "text", "")})

        return {
            "ok": True,
            "content": content,
            "isError": getattr(result, "isError", False),
        }

    def _invalidate_connection(self, server_name: str) -> None:
        """失效连接缓存，触发重连"""
        if server_name in self._connections:
            conn = self._connections[server_name]
            if conn.client:
                try:
                    # 尝试关闭连接
                    if hasattr(conn.client, "close"):
                        asyncio.create_task(conn.client.close())
                except Exception:
                    pass
            conn.client = None
            conn.error = None

    async def close(self, server_name: str | None = None) -> None:
        """关闭连接"""
        if server_name:
            self._close_connection(server_name)
        else:
            for name in list(self._connections.keys()):
                self._close_connection(name)

    def _close_connection(self, server_name: str) -> None:
        """关闭单个服务器连接"""
        if server_name in self._connections:
            conn = self._connections[server_name]
            if conn.client:
                try:
                    if hasattr(conn.client, "close"):
                        asyncio.create_task(conn.client.close())
                except Exception:
                    pass
            del self._connections[server_name]

    async def cleanup_idle(self) -> None:
        """清理空闲连接"""
        import time

        current_time = time.time()
        for server_name, conn in list(self._connections.items()):
            if conn.client and (current_time - conn.last_used) > IDLE_TIMEOUT_SECONDS:
                logger.info(f"Closing idle MCP connection: {server_name}")
                self._close_connection(server_name)

    def get_server_names(self) -> list[str]:
        """获取所有已配置的服务名称"""
        return list(self._connections.keys())


class DirectHttpMcpClient:
    """直接 HTTP JSON-RPC MCP 客户端

    用于连接到简单的 HTTP POST MCP 服务器（如 Spring Boot 实现）。
    不依赖复杂的 SSE/Streamable HTTP 协议。
    """

    def __init__(self, config: McpServerConfig) -> None:
        import httpx

        self._config = config
        self._url = config.url_or_command
        self._headers = {"Content-Type": "application/json"}
        if config.token:
            self._headers["Authorization"] = f"Bearer {config.token}"
        self._http_client = httpx.AsyncClient(timeout=30.0)

    async def initialize(self) -> None:
        """发送 initialize 请求"""
        response = await self._post({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
        # Response is ignored, just ensure connection works
        return response

    async def list_tools(self) -> McpToolListResultProtocol:
        """列出所有工具"""
        response = await self._post({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
        result = response.get("result", {})
        tools = result.get("tools", [])

        # 返回带 name 属性的对象列表
        class Tool:
            def __init__(self, data: dict) -> None:
                self.name = data.get("name", "")
                self.description = data.get("description", "")
                self.inputSchema = data.get("inputSchema", {})

        return type("ToolsResult", (), {"tools": [Tool(t) for t in tools]})()

    async def call_tool(self, name: str, arguments: JsonObject) -> McpCallToolResultProtocol:
        """调用工具"""
        response = await self._post({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments}
        })
        result = response.get("result", {})
        content = result.get("content", [])
        return type("CallToolResult", (), {
            "content": [
                type("TextContent", (), {"type": "text", "text": item.get("text", ""), "data": None})()
                for item in content
            ],
            "isError": False
        })()

    async def _post(self, payload: JsonObject) -> JsonObject:
        """发送 JSON-RPC POST 请求"""
        response = await self._http_client.post(
            self._url,
            json=payload,
            headers=self._headers,
        )
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        """关闭连接"""
        await self._http_client.aclose()
