from __future__ import annotations

from typing import Protocol

from json_types import JsonValue


class McpToolContentProtocol(Protocol):
    type: str | None
    text: str | None
    data: JsonValue | None
