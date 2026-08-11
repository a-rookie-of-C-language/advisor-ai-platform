"""Tests for memory type routing (差距1: 记忆类型分层).

覆盖场景：
- 记忆类型推断（semantic/episodic）
- 查询类型推断
- 类型权重计算
- 冲突解决按类型隔离
"""

from __future__ import annotations

from context.memory.core.governance import MemoryGovernance
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryItem import MemoryItem
from context.memory.pipeline.retrieval import _compute_type_weights, _infer_query_type
from context.memory.pipeline.writeback import MemoryWriteback

# ── 查询类型推断测试 ──


class TestQueryTypeInference:
    """Test query type inference for semantic/episodic routing."""

    def test_episodic_query_chinese(self) -> None:
        queries = [
            "上次讨论的毕设选题是什么",
            "之前帮我修的那个 bug",
            "曾经说过的话",
            "昨天的对话内容",
            "上周的会议记录",
        ]
        for q in queries:
            assert _infer_query_type(q) == "episodic", f"'{q}' should be episodic"

    def test_episodic_query_english(self) -> None:
        queries = [
            "last time we discussed the project",
            "what did we talk about yesterday",
            "previously mentioned requirements",
        ]
        for q in queries:
            assert _infer_query_type(q) == "episodic", f"'{q}' should be episodic"

    def test_semantic_query(self) -> None:
        queries = [
            "用户喜欢什么编程语言",
            "学生的专业是什么",
            "偏好简洁回答",
            "Python 和 Java 的区别",
        ]
        for q in queries:
            assert _infer_query_type(q) == "semantic", f"'{q}' should be semantic"


# ── 类型权重计算测试 ──


class TestTypeWeights:
    """Test type weight computation."""

    def test_episodic_query_weights(self) -> None:
        weights = _compute_type_weights("episodic")
        assert weights["episodic"] > weights["semantic"]
        assert weights["episodic"] == 0.7
        assert weights["semantic"] == 0.3

    def test_semantic_query_weights(self) -> None:
        weights = _compute_type_weights("semantic")
        assert weights["semantic"] > weights["episodic"]
        assert weights["semantic"] == 0.8
        assert weights["episodic"] == 0.2


# ── 规则类型推断测试 ──


class TestMemoryTypeInference:
    """Test memory type inference in writeback."""

    def test_episodic_markers_chinese(self) -> None:
        wb = MemoryWriteback()
        sentences = [
            "上次帮用户解决了登录问题",
            "之前讨论过毕设选题",
            "曾经修复过支付 bug",
            "昨天处理了数据导入",
        ]
        for s in sentences:
            assert wb._infer_memory_type(s) == "episodic", f"'{s}' should be episodic"

    def test_episodic_markers_english(self) -> None:
        wb = MemoryWriteback()
        sentences = [
            "last time we fixed the login issue",
            "previously discussed the project plan",
            "yesterday we resolved the bug",
        ]
        for s in sentences:
            assert wb._infer_memory_type(s) == "episodic", f"'{s}' should be episodic"

    def test_semantic_default(self) -> None:
        wb = MemoryWriteback()
        sentences = [
            "用户喜欢 Python",
            "用户是计科专业",
            "偏好简洁回答",
            "user prefers Python for data science",
        ]
        for s in sentences:
            assert wb._infer_memory_type(s) == "semantic", f"'{s}' should be semantic"


# ── 冲突解决按类型隔离测试 ──


class TestConflictResolutionByType:
    """Test that conflict resolution keeps different types separate."""

    def test_different_types_can_coexist(self) -> None:
        gov = MemoryGovernance()
        items = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.8, memory_type="semantic"),
            MemoryItem(id=2, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.7, memory_type="episodic"),
        ]
        result = gov.resolve_conflicts(items)
        assert len(result) == 2  # Both should survive

    def test_same_type_conflicts_resolved(self) -> None:
        gov = MemoryGovernance()
        items = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.7, memory_type="semantic"),
            MemoryItem(id=2, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.9, memory_type="semantic"),
        ]
        result = gov.resolve_conflicts(items)
        assert len(result) == 1
        assert result[0].id == 2  # Higher confidence wins


# ── MemoryItem 数据模型测试 ──


class TestMemoryItemModel:
    """Test MemoryItem data model fields."""

    def test_default_memory_type(self) -> None:
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test")
        assert item.memory_type == "semantic"

    def test_default_is_core(self) -> None:
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test")
        assert item.is_core is False

    def test_default_temporal_fields(self) -> None:
        item = MemoryItem(id=1, user_id=1, kb_id=1, content="test")
        assert item.valid_until is None
        assert item.supersedes_id is None
        assert item.merged_into_id is None

    def test_all_fields_settable(self) -> None:
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        item = MemoryItem(
            id=1,
            user_id=1,
            kb_id=1,
            content="test",
            memory_type="episodic",
            is_core=True,
            valid_until=now,
            supersedes_id=2,
            merged_into_id=3,
        )
        assert item.memory_type == "episodic"
        assert item.is_core is True
        assert item.valid_until == now
        assert item.supersedes_id == 2
        assert item.merged_into_id == 3


# ── MemoryCandidate 数据模型测试 ──


class TestMemoryCandidateModel:
    """Test MemoryCandidate data model fields."""

    def test_default_fields(self) -> None:
        candidate = MemoryCandidate(content="test")
        assert candidate.memory_type == "semantic"
        assert candidate.is_core is False
        assert candidate.confidence == 0.5

    def test_custom_fields(self) -> None:
        candidate = MemoryCandidate(content="test", confidence=0.9, memory_type="episodic", is_core=True)
        assert candidate.memory_type == "episodic"
        assert candidate.is_core is True
