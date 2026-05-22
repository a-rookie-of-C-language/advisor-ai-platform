from __future__ import annotations

from agent.json_types import JsonObject, JsonValue
from dataclasses import dataclass, field

from agents.tool_explorer.ToolExplorerEvent import ToolExplorerEvent


@dataclass(frozen=True)
class ToolExplorerOutcome:
    used: bool
    sufficient: bool
    summary: str = ""
    evidence: list[JsonObject] = field(default_factory=list)
    events: list[ToolExplorerEvent] = field(default_factory=list)
    tool_calls: list[JsonObject] = field(default_factory=list)
