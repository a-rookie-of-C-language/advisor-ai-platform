from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Set


@dataclass(slots=True)
class ProcessedQuery:
    original: str
    normalized: str
    tokens: List[str] = field(default_factory=list)
    stop_word_mask: List[bool] = field(default_factory=list)
    expanded_tokens: Set[str] = field(default_factory=set)
