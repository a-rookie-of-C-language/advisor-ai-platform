from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass(frozen=True)
class ToolExplorerStep:
    action: str
    tool_name: str = ""
    arguments: JsonObject = field(default_factory=dict)
    reason: str = ""
    sufficient: bool = False
    summary: str = ""
