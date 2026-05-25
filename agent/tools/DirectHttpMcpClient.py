from __future__ import annotations

from json_types import JsonObject
from tools.DirectMcpCallToolResult import DirectMcpCallToolResult
from tools.DirectMcpToolListResult import DirectMcpToolListResult
from tools.McpCallToolResultProtocol import McpCallToolResultProtocol
from tools.McpServerConfig import McpServerConfig
from tools.McpToolListResultProtocol import McpToolListResultProtocol


class DirectHttpMcpClient:
    """直接 HTTP JSON-RPC MCP 客户端。"""

    def __init__(self, config: McpServerConfig) -> None:
        import httpx

        self._config = config
        self._url = config.url_or_command
        self._headers = {"Content-Type": "application/json"}
        if config.token:
            self._headers["Authorization"] = f"Bearer {config.token}"
        self._http_client = httpx.AsyncClient(timeout=30.0)

    async def initialize(self) -> None:
        await self._post({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})

    async def list_tools(self) -> McpToolListResultProtocol:
        response = await self._post({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
        result = response.get("result", {})
        tools = result.get("tools", []) if isinstance(result, dict) else []
        return DirectMcpToolListResult([tool for tool in tools if isinstance(tool, dict)])

    async def call_tool(self, name: str, arguments: JsonObject) -> McpCallToolResultProtocol:
        response = await self._post(
            {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {"name": name, "arguments": arguments},
            }
        )
        result = response.get("result", {})
        content = result.get("content", []) if isinstance(result, dict) else []
        return DirectMcpCallToolResult([item for item in content if isinstance(item, dict)])

    async def _post(self, payload: JsonObject) -> JsonObject:
        response = await self._http_client.post(
            self._url,
            json=payload,
            headers=self._headers,
        )
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else {}

    async def close(self) -> None:
        await self._http_client.aclose()
