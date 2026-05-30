from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass(slots=True)
class MemoryCandidate:
    content: str
    confidence: float = 0.5
    source_turn_id: str | None = None
    tags: JsonObject = field(default_factory=dict)
    memory_type: str = "semantic"
    is_core: bool = False
