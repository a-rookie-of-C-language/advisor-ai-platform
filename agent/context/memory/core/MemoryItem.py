from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from json_types import JsonObject


@dataclass(slots=True)
class MemoryItem:
    id: int
    user_id: int
    kb_id: int
    content: str
    confidence: float = 0.5
    score: float = 0.0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    expires_at: datetime | None = None
    tags: JsonObject = field(default_factory=dict)
    memory_type: str = "semantic"
    valid_until: datetime | None = None
    supersedes_id: int | None = None
