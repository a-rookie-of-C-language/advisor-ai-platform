from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class SessionSummary:
    session_id: int
    summary: str
    updated_at: datetime | None = None
