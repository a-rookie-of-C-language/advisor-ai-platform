from __future__ import annotations

from typing import Protocol

from tools.mcp.protocol.McpToolDescriptorProtocol import McpToolDescriptorProtocol


class McpToolListResultProtocol(Protocol):
    tools: list[McpToolDescriptorProtocol]
