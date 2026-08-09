from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass(slots=True)
class ContextSegment:
    source: str
    content: str
    metadata: JsonObject = field(default_factory=dict)
