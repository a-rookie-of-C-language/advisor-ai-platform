from __future__ import annotations

from dataclasses import dataclass, field

from agents.tool_explorer.ToolExplorerEvent import ToolExplorerEvent
from json_types import JsonObject


@dataclass(frozen=True)
class ToolExplorerOutcome:
    used: bool
    sufficient: bool
    summary: str = ""
    evidence: list[JsonObject] = field(default_factory=list)
    events: list[ToolExplorerEvent] = field(default_factory=list)
    tool_calls: list[JsonObject] = field(default_factory=list)
