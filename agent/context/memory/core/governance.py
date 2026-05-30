from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache

from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryItem import MemoryItem


@lru_cache(maxsize=1024)
def _normalize_text_cached(text: str) -> str:
    """缓存归一化结果，避免重复处理"""
    return " ".join(text.lower().strip().split())


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
        """Basic check: content must be non-empty. Confidence filtering is handled by DecisionEngine."""
        return bool(candidate.content.strip())

    def deduplicate(self, candidates: list[MemoryCandidate]) -> list[MemoryCandidate]:
        seen: set[str] = set()
        result: list[MemoryCandidate] = []
        for candidate in sorted(candidates, key=lambda item: item.confidence, reverse=True):
            key = _normalize_text_cached(candidate.content)
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
            # Include memory_type in conflict key: different types can coexist
            type_prefix = f"[{item.memory_type}]"
            key = str(item.tags.get("memory_key", "")).strip()
            if not key:
                key = f"{type_prefix}:{_normalize_text_cached(item.content)}"
            else:
                key = f"{type_prefix}:{key}"
            existing = grouped.get(key)
            if existing is None:
                grouped[key] = item
                continue
            # 🚀 优化1: 使用时间戳比较，避免时区问题
            item_ts = self._get_timestamp(item.updated_at)
            existing_ts = self._get_timestamp(existing.updated_at)
            if (item.confidence, item_ts) > (existing.confidence, existing_ts):
                grouped[key] = item
        return list(grouped.values())

    @staticmethod
    def _get_timestamp(dt: datetime | None) -> float:
        """将 datetime 转为时间戳，处理时区问题"""
        if dt is None:
            return 0.0
        # 统一转为 UTC 时间戳
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()

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
        return _normalize_text_cached(value)
