from __future__ import annotations

from typing import Awaitable, Callable

from context.memory.core.MemoryCandidate import MemoryCandidate
from fusion.authority_boost import AuthorityBoostStrategy
from fusion.conflict_detect import ConflictDetectStrategy
from fusion.registry import SourcePriorityRegistry
from fusion.source_weight import SourceWeightStrategy
from fusion.time_decay import TimeDecayStrategy

Extractor = Callable[[str, str], list[MemoryCandidate] | Awaitable[list[MemoryCandidate]]]

DEFER_THRESHOLD = 8


def _u(*codes: int) -> str:
    return "".join(chr(code) for code in codes)


STREAM_ERROR_MESSAGE = _u(
    0x670D,
    0x52A1,
    0x5185,
    0x90E8,
    0x9519,
    0x8BEF,
    0xFF0C,
    0x8BF7,
    0x7A0D,
    0x540E,
    0x91CD,
    0x8BD5,
)


def build_default_fusion_pipeline() -> SourcePriorityRegistry:
    """Build the default cross-source fusion pipeline."""
    registry = SourcePriorityRegistry()
    registry.register(AuthorityBoostStrategy())
    registry.register(TimeDecayStrategy())
    registry.register(SourceWeightStrategy())
    registry.register(ConflictDetectStrategy())
    return registry
