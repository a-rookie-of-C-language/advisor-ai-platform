from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class WritebackResult:
    accepted: int
    rejected: int
    message: str = "ok"
