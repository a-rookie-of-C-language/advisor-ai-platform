"""Tests for temporal memory modeling (差距3: 时态建模).

覆盖场景：
- MemoryItem 时态字段
- API mapper 解析时态字段
- TTL 过滤
- 已失效记忆被过滤
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from context.memory.api.memory_api_mappers import to_memory_item
from context.memory.core.MemoryItem import MemoryItem
from context.memory.core.governance import MemoryGovernance


# ── 时态字段测试 ──


class TestTemporalFields:
    """Test temporal fields on MemoryItem."""

    def test_valid_until_default_none(self) -> None:
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test")
        assert item.valid_until is None

    def test_supersedes_id_default_none(self) -> None:
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test")
        assert item.supersedes_id is None

    def test_merged_into_id_default_none(self) -> None:
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test")
        assert item.merged_into_id is None

    def test_temporal_fields_settable(self) -> None:
        now = datetime.now(timezone.utc)
        item = MemoryItem(
            id=1, user_id=1, kb_id=1, content="test",
            valid_until=now, supersedes_id=2, merged_into_id=3,
        )
        assert item.valid_until == now
        assert item.supersedes_id == 2
        assert item.merged_into_id == 3


# ── API Mapper 解析测试 ──


class TestMemoryApiMappers:
    """Test API response parsing including temporal fields."""

    def test_parse_basic_fields(self) -> None:
        data = {
            "id": 1, "userId": 10, "kbId": 20, "content": "test content",
            "confidence": 0.8, "score": 0.5,
        }
        item = to_memory_item(data)
        assert item.id == 1
        assert item.user_id == 10
        assert item.kb_id == 20
        assert item.content == "test content"
        assert item.confidence == 0.8

    def test_parse_memory_type(self) -> None:
        data = {"id": 1, "userId": 1, "kbId": 1, "content": "test", "memoryType": "episodic"}
        item = to_memory_item(data)
        assert item.memory_type == "episodic"

    def test_parse_memory_type_default_semantic(self) -> None:
        data = {"id": 1, "userId": 1, "kbId": 1, "content": "test"}
        item = to_memory_item(data)
        assert item.memory_type == "semantic"

    def test_parse_is_core(self) -> None:
        data = {"id": 1, "userId": 1, "kbId": 1, "content": "test", "isCore": True}
        item = to_memory_item(data)
        assert item.is_core is True

    def test_parse_is_core_default_false(self) -> None:
        data = {"id": 1, "userId": 1, "kbId": 1, "content": "test"}
        item = to_memory_item(data)
        assert item.is_core is False

    def test_parse_valid_until(self) -> None:
        data = {"id": 1, "userId": 1, "kbId": 1, "content": "test", "validUntil": "2026-01-01T00:00:00Z"}
        item = to_memory_item(data)
        assert item.valid_until is not None

    def test_parse_valid_until_null(self) -> None:
        data = {"id": 1, "userId": 1, "kbId": 1, "content": "test", "validUntil": None}
        item = to_memory_item(data)
        assert item.valid_until is None

    def test_parse_supersedes_id(self) -> None:
        data = {"id": 2, "userId": 1, "kbId": 1, "content": "test", "supersedesId": 1}
        item = to_memory_item(data)
        assert item.supersedes_id == 1

    def test_parse_merged_into_id(self) -> None:
        data = {"id": 1, "userId": 1, "kbId": 1, "content": "test", "mergedIntoId": 5}
        item = to_memory_item(data)
        assert item.merged_into_id == 5


# ── TTL 过滤测试 ──


class TestTTLFiltering:
    """Test TTL-based memory filtering."""

    def test_expired_memories_filtered(self) -> None:
        gov = MemoryGovernance()
        now = datetime.now(timezone.utc)
        items = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="valid", expires_at=now + timedelta(days=1)),
            MemoryItem(id=2, user_id=1, kb_id=1, content="expired", expires_at=now - timedelta(days=1)),
        ]
        result = gov.apply_ttl(items)
        assert len(result) == 1
        assert result[0].id == 1

    def test_no_expiry_kept(self) -> None:
        gov = MemoryGovernance()
        items = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="no expiry", expires_at=None),
        ]
        result = gov.apply_ttl(items)
        assert len(result) == 1

    def test_all_expired(self) -> None:
        gov = MemoryGovernance()
        now = datetime.now(timezone.utc)
        items = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="expired1", expires_at=now - timedelta(hours=1)),
            MemoryItem(id=2, user_id=1, kb_id=1, content="expired2", expires_at=now - timedelta(days=1)),
        ]
        result = gov.apply_ttl(items)
        assert len(result) == 0


# ── 时间衰减测试 ──


class TestTimeDecay:
    """Test time decay computation."""

    def test_recent_memory_high_decay(self) -> None:
        gov = MemoryGovernance(memory_half_life_days=30.0)
        now = datetime.now(timezone.utc)
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test", updated_at=now)
        decay = gov.compute_time_decay(item, now)
        assert decay > 0.99  # Should be close to 1.0

    def test_old_memory_low_decay(self) -> None:
        gov = MemoryGovernance(memory_half_life_days=30.0)
        now = datetime.now(timezone.utc)
        old_time = now - timedelta(days=60)
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test", updated_at=old_time)
        decay = gov.compute_time_decay(item, now)
        assert decay < 0.3  # Should be low after 2 half-lives

    def test_half_life_decay(self) -> None:
        gov = MemoryGovernance(memory_half_life_days=30.0)
        now = datetime.now(timezone.utc)
        half_life_time = now - timedelta(days=30)
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test", updated_at=half_life_time)
        decay = gov.compute_time_decay(item, now)
        assert abs(decay - 0.5) < 0.01  # Should be exactly 0.5
