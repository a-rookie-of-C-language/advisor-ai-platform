from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class DecisionType(str, Enum):
    """Memory write decision types."""

    ADD = "add"
    UPDATE = "update"
    MERGE = "merge"
    INVALIDATE = "invalidate"
    IGNORE = "ignore"


@dataclass(slots=True)
class MemoryDecision:
    """Result of memory write decision."""

    decision: DecisionType
    reason: str
    target_memory_id: int | None = None
    target_memory_ids: list[int] | None = None
    merged_content: str | None = None
    is_core: bool = False
