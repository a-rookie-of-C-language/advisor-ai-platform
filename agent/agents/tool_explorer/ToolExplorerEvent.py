from __future__ import annotations

from dataclasses import dataclass

from json_types import JsonObject


@dataclass(frozen=True)
class ToolExplorerEvent:
    event: str
    payload: JsonObject
