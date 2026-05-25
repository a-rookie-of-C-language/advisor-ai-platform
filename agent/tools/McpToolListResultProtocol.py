from __future__ import annotations

from typing import Protocol

from tools.McpToolDescriptorProtocol import McpToolDescriptorProtocol


class McpToolListResultProtocol(Protocol):
    tools: list[McpToolDescriptorProtocol]
