from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


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
    tags: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class MemoryCandidate:
    content: str
    confidence: float = 0.5
    source_turn_id: str | None = None
    tags: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class SessionSummary:
    session_id: int
    summary: str
    updated_at: datetime | None = None


@dataclass(slots=True)
class MemoryContext:
    short_term: list[dict[str, str]] = field(default_factory=list)
    long_term: list[MemoryItem] = field(default_factory=list)
    summary: SessionSummary | None = None


@dataclass(slots=True)
class WritebackResult:
    accepted: int
    rejected: int
    message: str = "ok"
