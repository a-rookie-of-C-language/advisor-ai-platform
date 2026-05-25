from __future__ import annotations

from dataclasses import dataclass


@dataclass
class WebFetchResult:
    content: str
    url: str
    source: str = "web"
    safe: bool = True
    filtered_reason: str | None = None
