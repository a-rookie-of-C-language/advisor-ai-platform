"""Tests for memory governance (差距2+4: 决策引擎 + 合并机制).

覆盖场景：
- 去重（deduplicate）
- 冲突解决（resolve_conflicts）
- 内容检查（should_write_candidate）
- 时间衰减
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from context.memory.core.governance import MemoryGovernance
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryItem import MemoryItem

# ── 内容检查测试 ──


class TestShouldWriteCandidate:
    """Test basic content validation."""

    def test_empty_content_rejected(self) -> None:
        gov = MemoryGovernance()
        candidate = MemoryCandidate(content="", confidence=0.9)
        assert gov.should_write_candidate(candidate) is False

    def test_whitespace_content_rejected(self) -> None:
        gov = MemoryGovernance()
        candidate = MemoryCandidate(content="   ", confidence=0.9)
        assert gov.should_write_candidate(candidate) is False

    def test_valid_content_accepted(self) -> None:
        gov = MemoryGovernance()
        candidate = MemoryCandidate(content="用户喜欢 Python", confidence=0.9)
        assert gov.should_write_candidate(candidate) is True

    def test_low_confidence_accepted(self) -> None:
        """Governance no longer filters by confidence - DecisionEngine handles that."""
        gov = MemoryGovernance()
        candidate = MemoryCandidate(content="test", confidence=0.1)
        assert gov.should_write_candidate(candidate) is True


# ── 去重测试 ──


class TestDeduplicate:
    """Test candidate deduplication."""

    def test_exact_duplicates_removed(self) -> None:
        gov = MemoryGovernance()
        candidates = [
            MemoryCandidate(content="喜欢 Python", confidence=0.8),
            MemoryCandidate(content="喜欢 Python", confidence=0.7),
        ]
        result = gov.deduplicate(candidates)
        assert len(result) == 1
        assert result[0].confidence == 0.8  # Higher confidence kept

    def test_normalized_duplicates_removed(self) -> None:
        gov = MemoryGovernance()
        candidates = [
            MemoryCandidate(content="喜欢 Python", confidence=0.8),
            MemoryCandidate(content="  喜欢  Python  ", confidence=0.7),
        ]
        result = gov.deduplicate(candidates)
        assert len(result) == 1

    def test_different_content_kept(self) -> None:
        gov = MemoryGovernance()
        candidates = [
            MemoryCandidate(content="喜欢 Python", confidence=0.8),
            MemoryCandidate(content="喜欢 Java", confidence=0.7),
        ]
        result = gov.deduplicate(candidates)
        assert len(result) == 2

    def test_max_candidates_per_turn(self) -> None:
        gov = MemoryGovernance(max_candidates_per_turn=3)
        candidates = [MemoryCandidate(content=f"记忆{i}", confidence=0.9 - i * 0.1) for i in range(10)]
        result = gov.deduplicate(candidates)
        assert len(result) <= 3


# ── 冲突解决测试 ──


class TestResolveConflicts:
    """Test conflict resolution with memory type awareness."""

    def test_same_content_different_type_coexist(self) -> None:
        gov = MemoryGovernance()
        items = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.8, memory_type="semantic"),
            MemoryItem(id=2, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.7, memory_type="episodic"),
        ]
        result = gov.resolve_conflicts(items)
        assert len(result) == 2

    def test_same_content_same_type_conflict(self) -> None:
        gov = MemoryGovernance()
        items = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.7, memory_type="semantic"),
            MemoryItem(id=2, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.9, memory_type="semantic"),
        ]
        result = gov.resolve_conflicts(items)
        assert len(result) == 1
        assert result[0].id == 2  # Higher confidence wins

    def test_memory_key_based_conflict(self) -> None:
        gov = MemoryGovernance()
        items = [
            MemoryItem(
                id=1,
                user_id=1,
                kb_id=1,
                content="旧内容",
                confidence=0.7,
                memory_type="semantic",
                tags={"memory_key": "user_lang_pref"},
            ),
            MemoryItem(
                id=2,
                user_id=1,
                kb_id=1,
                content="新内容",
                confidence=0.9,
                memory_type="semantic",
                tags={"memory_key": "user_lang_pref"},
            ),
        ]
        result = gov.resolve_conflicts(items)
        assert len(result) == 1
        assert result[0].id == 2

    def test_empty_list(self) -> None:
        gov = MemoryGovernance()
        result = gov.resolve_conflicts([])
        assert result == []


# ── 时间衰减综合测试 ──


class TestTimeDecayComprehensive:
    """Comprehensive time decay tests."""

    def test_zero_age(self) -> None:
        gov = MemoryGovernance(memory_half_life_days=30.0)
        now = datetime.now(timezone.utc)
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test", updated_at=now)
        assert gov.compute_time_decay(item, now) == pytest.approx(1.0, abs=0.01)

    def test_one_half_life(self) -> None:
        gov = MemoryGovernance(memory_half_life_days=30.0)
        now = datetime.now(timezone.utc)
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test", updated_at=now - timedelta(days=30))
        assert gov.compute_time_decay(item, now) == pytest.approx(0.5, abs=0.01)

    def test_two_half_lives(self) -> None:
        gov = MemoryGovernance(memory_half_life_days=30.0)
        now = datetime.now(timezone.utc)
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test", updated_at=now - timedelta(days=60))
        assert gov.compute_time_decay(item, now) == pytest.approx(0.25, abs=0.01)

    def test_none_updated_at(self) -> None:
        gov = MemoryGovernance()
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test", updated_at=None)
        decay = gov.compute_time_decay(item)
        assert decay == 0.5  # Default
