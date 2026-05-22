from __future__ import annotations

from agent.types import JsonObject, JsonValue
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ToolExplorerStep:
    action: str
    tool_name: str = ""
    arguments: JsonObject = field(default_factory=dict)
    reason: str = ""
    sufficient: bool = False
    summary: str = ""
