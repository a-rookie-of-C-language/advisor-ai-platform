from __future__ import annotations

from typing import Protocol

from json_types import JsonObject
from tools.mcp.protocol.McpToolAnnotationsProtocol import McpToolAnnotationsProtocol


class McpToolDescriptorProtocol(Protocol):
    name: str
    description: str
    inputSchema: JsonObject
    annotations: McpToolAnnotationsProtocol | None
    _meta: JsonObject | None
