from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ToolCallResult:
    tool_name: str
    success: bool
    result: str
    error: str | None = None
