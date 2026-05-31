from __future__ import annotations

from json_types import JsonObject
from tools.mcp.direct.DirectMcpToolDescriptor import DirectMcpToolDescriptor


class DirectMcpToolListResult:
    def __init__(self, tools: list[JsonObject]) -> None:
        self.tools = [DirectMcpToolDescriptor(tool) for tool in tools]
