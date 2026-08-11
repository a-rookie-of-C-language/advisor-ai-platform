"""Tests for memory decision engine (差距2: 写入决策增强).

覆盖场景：
- 规则快速判断：低置信度、闲聊、临时信息、指代不完整
- LLM 精细决策：add/update/merge/invalidate/ignore
- 多目标失效：target_memory_ids
- 核心记忆判断：is_core
"""

from __future__ import annotations

import pytest

from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryDecision import DecisionType
from context.memory.core.MemoryItem import MemoryItem
from context.memory.pipeline.decision_engine import DecisionEngine

# ── 规则快速判断测试 ──


class TestRuleDecide:
    """Rule-based fast decision tests."""

    def test_low_confidence_ignored(self) -> None:
        engine = DecisionEngine(low_confidence_threshold=0.4)
        candidate = MemoryCandidate(content="随便说说", confidence=0.3)
        result = engine._rule_decide(candidate, [])
        assert result is not None
        assert result.decision == DecisionType.IGNORE
        assert "confidence" in result.reason.lower()

    def test_casual_chat_ignored(self) -> None:
        engine = DecisionEngine()
        for content in ["好的", "嗯", "谢谢", "hello", "ok", "再见"]:
            candidate = MemoryCandidate(content=content, confidence=0.8)
            result = engine._rule_decide(candidate, [])
            assert result is not None, f"'{content}' should be ignored"
            assert result.decision == DecisionType.IGNORE

    def test_temporary_info_ignored(self) -> None:
        engine = DecisionEngine()
        for content in ["今天天气好冷", "肚子饿了", "好困啊"]:
            candidate = MemoryCandidate(content=content, confidence=0.7)
            result = engine._rule_decide(candidate, [])
            assert result is not None, f"'{content}' should be ignored"
            assert result.decision == DecisionType.IGNORE

    def test_ambiguous_reference_ignored(self) -> None:
        engine = DecisionEngine()
        candidate = MemoryCandidate(content="那个东西不好用", confidence=0.7)
        result = engine._rule_decide(candidate, [])
        assert result is not None
        assert result.decision == DecisionType.IGNORE

    def test_no_similar_memories_add(self) -> None:
        engine = DecisionEngine()
        candidate = MemoryCandidate(content="用户是计科专业大三学生", confidence=0.8)
        result = engine._rule_decide(candidate, [])
        assert result is not None
        assert result.decision == DecisionType.ADD
        assert "new" in result.reason.lower() or "no similar" in result.reason.lower()

    def test_near_duplicate_update(self) -> None:
        engine = DecisionEngine(near_duplicate_threshold=0.95)
        candidate = MemoryCandidate(content="喜欢 Python", confidence=0.8)
        similar = [MemoryItem(id=1, user_id=1, kb_id=1, content="喜欢 Python", confidence=0.7, score=0.98)]
        result = engine._rule_decide(candidate, similar)
        assert result is not None
        assert result.decision == DecisionType.UPDATE
        assert result.target_memory_id == 1

    def test_uncertain_needs_llm(self) -> None:
        engine = DecisionEngine(near_duplicate_threshold=0.95)
        candidate = MemoryCandidate(content="用户喜欢编程", confidence=0.7)
        similar = [MemoryItem(id=1, user_id=1, kb_id=1, content="用户喜欢写代码", confidence=0.7, score=0.8)]
        result = engine._rule_decide(candidate, similar)
        assert result is None  # Needs LLM decision


# ── LLM 决策解析测试 ──


class TestParseDecision:
    """LLM response parsing tests."""

    def test_parse_add_decision(self) -> None:
        engine = DecisionEngine()
        response = '{"decision": "add", "reason": "new preference", "is_core": true}'
        result = engine._parse_decision(response, [])
        assert result is not None
        assert result.decision == DecisionType.ADD
        assert result.is_core is True

    def test_parse_update_decision(self) -> None:
        engine = DecisionEngine()
        similar = [MemoryItem(id=10, user_id=1, kb_id=1, content="old", confidence=0.7)]
        response = '{"decision": "update", "reason": "preference changed", "target_memory_id": 10}'
        result = engine._parse_decision(response, similar)
        assert result is not None
        assert result.decision == DecisionType.UPDATE
        assert result.target_memory_id == 10

    def test_parse_merge_decision(self) -> None:
        engine = DecisionEngine()
        similar = [MemoryItem(id=20, user_id=1, kb_id=1, content="old", confidence=0.7)]
        response = (
            '{"decision": "merge", "reason": "same meaning", "target_memory_id": 20, "merged_content": "merged text"}'
        )
        result = engine._parse_decision(response, similar)
        assert result is not None
        assert result.decision == DecisionType.MERGE
        assert result.target_memory_id == 20
        assert result.merged_content == "merged text"

    def test_parse_invalidate_multi_target(self) -> None:
        engine = DecisionEngine()
        response = '{"decision": "invalidate", "reason": "contradicts", "target_memory_ids": [1, 2, 3]}'
        result = engine._parse_decision(response, [])
        assert result is not None
        assert result.decision == DecisionType.INVALIDATE
        assert result.target_memory_ids == [1, 2, 3]

    def test_parse_ignore_decision(self) -> None:
        engine = DecisionEngine()
        response = '{"decision": "ignore", "reason": "no value"}'
        result = engine._parse_decision(response, [])
        assert result is not None
        assert result.decision == DecisionType.IGNORE

    def test_parse_invalid_json_returns_none(self) -> None:
        engine = DecisionEngine()
        result = engine._parse_decision("not json", [])
        assert result is None

    def test_parse_unknown_decision_returns_none(self) -> None:
        engine = DecisionEngine()
        response = '{"decision": "unknown_type", "reason": "test"}'
        result = engine._parse_decision(response, [])
        assert result is None

    def test_parse_markdown_json(self) -> None:
        engine = DecisionEngine()
        response = '```json\n{"decision": "add", "reason": "test"}\n```'
        result = engine._parse_decision(response, [])
        assert result is not None
        assert result.decision == DecisionType.ADD


# ── 异步决策测试 ──


class TestAsyncDecide:
    """Async decision tests with mock LLM."""

    @pytest.mark.asyncio
    async def test_rule_fast_path_no_llm(self) -> None:
        engine = DecisionEngine(llm_caller=None)
        candidate = MemoryCandidate(content="用户喜欢 Python", confidence=0.8)
        result = await engine.decide(candidate, [])
        assert result.decision == DecisionType.ADD

    @pytest.mark.asyncio
    async def test_llm_fallback_for_uncertain(self) -> None:
        async def mock_llm(prompt: str) -> str:
            return '{"decision": "add", "reason": "new info", "is_core": false}'

        engine = DecisionEngine(llm_caller=mock_llm)
        candidate = MemoryCandidate(content="用户喜欢编程", confidence=0.7)
        similar = [MemoryItem(id=1, user_id=1, kb_id=1, content="用户喜欢写代码", confidence=0.7, score=0.8)]
        result = await engine.decide(candidate, similar)
        assert result.decision == DecisionType.ADD

    @pytest.mark.asyncio
    async def test_llm_failure_fallback_to_add(self) -> None:
        async def failing_llm(prompt: str) -> str:
            raise Exception("LLM service down")

        engine = DecisionEngine(llm_caller=failing_llm)
        candidate = MemoryCandidate(content="用户喜欢编程", confidence=0.7)
        similar = [MemoryItem(id=1, user_id=1, kb_id=1, content="类似内容", confidence=0.7, score=0.8)]
        result = await engine.decide(candidate, similar)
        assert result.decision == DecisionType.ADD
        assert "fallback" in result.reason.lower()
