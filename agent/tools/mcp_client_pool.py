from __future__ import annotations

import asyncio
import inspect
import logging

from json_types import JsonObject
from tools.McpCallToolResultProtocol import McpCallToolResultProtocol
from tools.McpClientProtocol import McpClientProtocol
from tools.McpConnection import McpConnection
from tools.McpServerConfig import McpServerConfig
from tools.mcp_config_parser import parse_mcp_server_configs
from tools.mcp_connection_factory import McpConnectionFactory
from tools.mcp_tool_result_parser import parse_mcp_tool_result

logger = logging.getLogger(__name__)

# 并发控制限制
LOCAL_CONCURRENCY_LIMIT = 3
REMOTE_CONCURRENCY_LIMIT = 20

# 连接空闲超时（秒）
IDLE_TIMEOUT_SECONDS = 300  # 5分钟


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
        self._connection_factory = McpConnectionFactory(
            local_semaphore=self._local_semaphore,
            remote_semaphore=self._remote_semaphore,
        )

    def _get_lock(self, server_name: str) -> asyncio.Lock:
        if server_name not in self._locks:
            self._locks[server_name] = asyncio.Lock()
        return self._locks[server_name]

    @staticmethod
    def parse_env_config() -> list[McpServerConfig]:
        """解析 .env 中的 MCP_SERVERS 配置

        格式：name:transport:url,...

        示例：
            MCP_SERVERS=filesystem:stdio:/path/to/server,github:http:http://localhost:8000
        """
        return parse_mcp_server_configs()

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
        return await self._connection_factory.connect(config)

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
        return parse_mcp_tool_result(result)

    def _invalidate_connection(self, server_name: str) -> None:
        """失效连接缓存，触发重连"""
        if server_name in self._connections:
            conn = self._connections[server_name]
            if conn.client:
                self._schedule_client_close(server_name, conn.client)
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
                self._schedule_client_close(server_name, conn.client)
            del self._connections[server_name]

    def _schedule_client_close(self, server_name: str, client: McpClientProtocol) -> None:
        close = getattr(client, "close", None)
        if close is None:
            return
        try:
            result = close()
        except Exception as exc:
            logger.debug("MCP client close failed: server=%s, error=%s", server_name, exc)
            return
        if inspect.isawaitable(result):
            asyncio.create_task(self._await_client_close(server_name, result))

    async def _await_client_close(self, server_name: str, close_result) -> None:
        try:
            await close_result
        except Exception as exc:
            logger.debug("MCP client async close failed: server=%s, error=%s", server_name, exc)

    async def cleanup_idle(self) -> None:
        """清理空闲连接"""
        current_time = asyncio.get_event_loop().time()
        for server_name, conn in list(self._connections.items()):
            if conn.client and (current_time - conn.last_used) > IDLE_TIMEOUT_SECONDS:
                logger.info(f"Closing idle MCP connection: {server_name}")
                self._close_connection(server_name)

    def get_server_names(self) -> list[str]:
        """获取所有已配置的服务名称"""
        return list(self._connections.keys())
