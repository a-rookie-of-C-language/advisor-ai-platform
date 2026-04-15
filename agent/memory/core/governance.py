from __future__ import annotations

from datetime import datetime, timezone

from memory.core.schema import MemoryCandidate, MemoryItem


class MemoryGovernance:
    def __init__(
        self,
        min_confidence: float = 0.65,
        max_candidates_per_turn: int = 6,
    ) -> None:
        self._min_confidence = min_confidence
        self._max_candidates_per_turn = max_candidates_per_turn

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

    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.lower().strip().split())
