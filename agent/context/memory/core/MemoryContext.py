from __future__ import annotations

from dataclasses import dataclass, field

from context.memory.core.MemoryItem import MemoryItem
from context.memory.core.SessionSummary import SessionSummary


@dataclass(slots=True)
class MemoryContext:
    short_term: list[dict[str, str]] = field(default_factory=list)
    long_term: list[MemoryItem] = field(default_factory=list)
    summary: SessionSummary | None = None
