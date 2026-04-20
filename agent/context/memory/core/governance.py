from __future__ import annotations

from datetime import datetime, timezone

from agent.context.memory.core.schema import MemoryCandidate, MemoryItem


class MemoryGovernance:
    def __init__(
        self,
        min_confidence: float = 0.55,
        max_candidates_per_turn: int = 8,
        summary_turn_threshold: int = 10,
        summary_token_threshold: int = 2400,
        llm_extract_enabled: bool = True,
        memory_half_life_days: float = 30.0,
        query_enable_synonym: bool = True,
        query_enable_normalization: bool = True,
    ) -> None:
        self._min_confidence = min_confidence
        self._max_candidates_per_turn = max_candidates_per_turn
        self._summary_turn_threshold = summary_turn_threshold
        self._summary_token_threshold = summary_token_threshold
        self._llm_extract_enabled = llm_extract_enabled
        self._memory_half_life_days = max(memory_half_life_days, 1.0)
        self._query_enable_synonym = query_enable_synonym
        self._query_enable_normalization = query_enable_normalization

    @property
    def summary_turn_threshold(self) -> int:
        return self._summary_turn_threshold

    @property
    def summary_token_threshold(self) -> int:
        return self._summary_token_threshold

    @property
    def llm_extract_enabled(self) -> bool:
        return self._llm_extract_enabled

    @property
    def query_enable_synonym(self) -> bool:
        return self._query_enable_synonym

    @property
    def query_enable_normalization(self) -> bool:
        return self._query_enable_normalization

    def should_write_candidate(self, candidate: MemoryCandidate) -> bool:
        return bool(candidate.content.strip()) and candidate.confidence >= self._min_confidence

    def deduplicate(self, candidates: list[MemoryCandidate]) -> list[MemoryCandidate]:
        seen: set[str] = set()
        result: list[MemoryCandidate] = []
        for candidate in sorted(candidates, key=lambda item: item.confidence, reverse=True):
            key = self._normalize_text(candidate.content)
            if key in seen:
                continue
            seen.add(key)
            result.append(candidate)
            if len(result) >= self._max_candidates_per_turn:
                break
        return result

    def apply_ttl(self, items: list[MemoryItem]) -> list[MemoryItem]:
        now = datetime.now(timezone.utc)
        return [item for item in items if item.expires_at is None or item.expires_at >= now]

    def resolve_conflicts(self, items: list[MemoryItem]) -> list[MemoryItem]:
        grouped: dict[str, MemoryItem] = {}
        for item in items:
            key = str(item.tags.get("memory_key", "")).strip() or self._normalize_text(item.content)
            existing = grouped.get(key)
            if existing is None:
                grouped[key] = item
                continue
            if (item.confidence, item.updated_at or datetime.min) > (
                existing.confidence,
                existing.updated_at or datetime.min,
            ):
                grouped[key] = item
        return list(grouped.values())

    def compute_time_decay(self, item: MemoryItem, now: datetime | None = None) -> float:
        reference = item.updated_at or item.created_at
        if reference is None:
            return 0.5

        if reference.tzinfo is None:
            reference = reference.replace(tzinfo=timezone.utc)

        now_utc = now or datetime.now(timezone.utc)
        age_seconds = max((now_utc - reference).total_seconds(), 0.0)
        age_days = age_seconds / 86400.0
        return pow(0.5, age_days / self._memory_half_life_days)

    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.lower().strip().split())
