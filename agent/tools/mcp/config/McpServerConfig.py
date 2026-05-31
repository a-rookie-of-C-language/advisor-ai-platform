from __future__ import annotations

from dataclasses import dataclass


@dataclass
class McpServerConfig:
    """MCP 服务器配置"""

    name: str
    transport_type: str
    url_or_command: str
    token: str | None = None
