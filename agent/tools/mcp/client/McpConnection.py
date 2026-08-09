from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from json_types import JsonObject
from tools.mcp.config.McpServerConfig import McpServerConfig

if TYPE_CHECKING:
    from tools.mcp.protocol.McpClientProtocol import McpClientProtocol


@dataclass
class McpConnection:
    """MCP 连接状态"""

    config: McpServerConfig
    client: "McpClientProtocol | None" = None
    last_used: float = 0.0
    is_connecting: bool = False
    error: str | None = None
    _tool_list: list[JsonObject] | None = None
