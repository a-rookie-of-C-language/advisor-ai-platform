from __future__ import annotations

from json_types import JsonObject
from tools.McpCallToolResultProtocol import McpCallToolResultProtocol


def parse_mcp_tool_result(result: McpCallToolResultProtocol) -> JsonObject:
    content = []
    if hasattr(result, "content"):
        for item in result.content:
            if hasattr(item, "text"):
                content.append({"type": "text", "text": item.text})
            elif hasattr(item, "data"):
                content.append({"type": "text", "text": item.data})
            elif hasattr(item, "type"):
                content.append({"type": item.type, "text": getattr(item, "text", "")})

    return {
        "ok": True,
        "content": content,
        "isError": getattr(result, "isError", False),
    }
