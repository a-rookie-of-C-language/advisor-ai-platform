from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RegexMatch:
    label: str
    start: int
    end: int
    matched: str
