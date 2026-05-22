from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from agents.tool_explorer.ToolExplorerEvent import ToolExplorerEvent


@dataclass(frozen=True)
class ToolExplorerOutcome:
    used: bool
    sufficient: bool
    summary: str = ""
    evidence: list[dict[str, Any]] = field(default_factory=list)
    events: list[ToolExplorerEvent] = field(default_factory=list)
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
