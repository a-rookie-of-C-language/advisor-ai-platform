from __future__ import annotations

from typing import Protocol

from tools.McpToolContentProtocol import McpToolContentProtocol


class McpCallToolResultProtocol(Protocol):
    content: list[McpToolContentProtocol]
    isError: bool
