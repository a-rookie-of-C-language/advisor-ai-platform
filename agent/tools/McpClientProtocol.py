from __future__ import annotations

from typing import Protocol

from json_types import JsonObject
from tools.McpCallToolResultProtocol import McpCallToolResultProtocol
from tools.McpToolListResultProtocol import McpToolListResultProtocol


class McpClientProtocol(Protocol):
    async def list_tools(self) -> McpToolListResultProtocol: ...

    async def call_tool(self, name: str, arguments: JsonObject) -> McpCallToolResultProtocol: ...

    async def close(self) -> None: ...
