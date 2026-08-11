from __future__ import annotations

from json_types import JsonObject
from tools.mcp.direct.DirectMcpTextContent import DirectMcpTextContent


class DirectMcpCallToolResult:
    def __init__(self, content: list[JsonObject], *, is_error: bool = False) -> None:
        self.content = [
            DirectMcpTextContent(str(item.get("text", "") or "")) for item in content if isinstance(item, dict)
        ]
        self.isError = is_error
