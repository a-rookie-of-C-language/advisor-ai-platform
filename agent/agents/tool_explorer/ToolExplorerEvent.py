from __future__ import annotations

from agent.json_types import JsonObject, JsonValue
from dataclasses import dataclass


@dataclass(frozen=True)
class ToolExplorerEvent:
    event: str
    payload: JsonObject
