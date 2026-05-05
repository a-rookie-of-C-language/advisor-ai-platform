from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class WebSearchResult:
    summary: str
    sources: list[dict[str, Any]] = field(default_factory=list)
    safe: bool = True
    filtered_reason: str | None = None
    key_facts: list[str] = field(default_factory=list)
