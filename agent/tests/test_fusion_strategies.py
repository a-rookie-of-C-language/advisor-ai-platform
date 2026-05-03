from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from fusion.authority_boost import AuthorityBoostStrategy
from fusion.conflict_detect import ConflictDetectStrategy
from fusion.registry import SourcePriorityRegistry
from fusion.source_candidate import SourceCandidate
from fusion.source_weight import SourceWeightStrategy
from fusion.time_decay import TimeDecayStrategy


def _candidate(
    content: str,
    source: str,
    score: float = 1.0,
    **metadata,
) -> SourceCandidate:
    return SourceCandidate(content=content, source=source, score=score, metadata=metadata)


class TestAuthorityBoostStrategy:
    def test_boosts_official_sources(self) -> None:
        strategy = AuthorityBoostStrategy(boost=0.5)
        candidates = [
            _candidate("政策内容", "rag", authority="official"),
            _candidate("普通内容", "rag", authority="secondary"),
        ]
        result = strategy.rank(candidates, query="test", scene_hint="policy")
        assert result[0].score == pytest.approx(1.5)
        assert result[1].score == pytest.approx(1.0)

    def test_no_boost_when_no_authority_metadata(self) -> None:
        strategy = AuthorityBoostStrategy(boost=0.5)
        candidates = [_candidate("内容", "rag")]
        result = strategy.rank(candidates, query="test", scene_hint="general")
        assert result[0].score == pytest.approx(1.0)

    def test_custom_boost_value(self) -> None:
        strategy = AuthorityBoostStrategy(boost=1.0)
        candidates = [_candidate("官方文件", "rag", authority="official", score=0.8)]
        result = strategy.rank(candidates, query="test", scene_hint="policy")
        assert result[0].score == pytest.approx(1.6)

    def test_name_and_order(self) -> None:
        strategy = AuthorityBoostStrategy()
        assert strategy.name == "authority_boost_v1"
        assert strategy.order == 100


class TestTimeDecayStrategy:
    def test_recent_date_gets_higher_boost(self) -> None:
        strategy = TimeDecayStrategy(half_life_years=3.0, boost=0.5)
        recent = datetime.now() - timedelta(days=30)
        old = datetime.now() - timedelta(days=365 * 5)
        candidates = [
            _candidate("新政策", "rag", effective_date=recent.isoformat()),
            _candidate("旧政策", "rag", effective_date=old.isoformat()),
        ]
        result = strategy.rank(candidates, query="test", scene_hint="policy")
        assert result[0].score > result[1].score

    def test_no_date_metadata_no_change(self) -> None:
        strategy = TimeDecayStrategy()
        candidates = [_candidate("无日期", "rag")]
        result = strategy.rank(candidates, query="test", scene_hint="general")
        assert result[0].score == pytest.approx(1.0)

    def test_invalid_date_skipped(self) -> None:
        strategy = TimeDecayStrategy()
        candidates = [_candidate("无效日期", "rag", effective_date="not-a-date")]
        result = strategy.rank(candidates, query="test", scene_hint="general")
        assert result[0].score == pytest.approx(1.0)

    def test_name_and_order(self) -> None:
        strategy = TimeDecayStrategy()
        assert strategy.name == "time_decay_v1"
        assert strategy.order == 200


class TestSourceWeightStrategy:
    def test_rag_weight_highest(self) -> None:
        strategy = SourceWeightStrategy()
        candidates = [
            _candidate("RAG", "rag"),
            _candidate("Web", "web"),
            _candidate("用户", "user_context"),
        ]
        result = strategy.rank(candidates, query="test", scene_hint="general")
        assert result[0].score == pytest.approx(1.0)
        assert result[1].score == pytest.approx(0.7)
        assert result[2].score == pytest.approx(0.5)

    def test_custom_weights(self) -> None:
        strategy = SourceWeightStrategy(weights={"rag": 2.0, "web": 1.0})
        candidates = [_candidate("RAG", "rag"), _candidate("Web", "web")]
        result = strategy.rank(candidates, query="test", scene_hint="general")
        assert result[0].score == pytest.approx(2.0)
        assert result[1].score == pytest.approx(1.0)

    def test_unknown_source_uses_default(self) -> None:
        strategy = SourceWeightStrategy()
        candidates = [_candidate("未知", "unknown_source")]
        result = strategy.rank(candidates, query="test", scene_hint="general")
        assert result[0].score == pytest.approx(0.6)

    def test_name_and_order(self) -> None:
        strategy = SourceWeightStrategy()
        assert strategy.name == "source_weight_v1"
        assert strategy.order == 300


class TestConflictDetectStrategy:
    def test_detects_conflict_with_non_substring_negation(self) -> None:
        """测试能检测到矛盾的情况（否定词不包含肯定词）。

        注意：当前实现对"允许"→"不允许"这类子串否定词无法检测。
        """
        strategy = ConflictDetectStrategy()
        # 使用"必须"和"不必"（"不必"不包含"必须"）
        candidates = [
            _candidate("学生必须参加考试", "rag"),
            _candidate("学生不必参加考试", "web"),
        ]
        result = strategy.rank(candidates, query="考试", scene_hint="policy")
        hint = result[0].metadata.get("_conflict_hint")
        assert hint is not None
        assert "矛盾" in hint

    def test_substring_negation_not_detected(self) -> None:
        """验证当前实现无法检测子串否定词（已知局限性）。"""
        strategy = ConflictDetectStrategy()
        # "不允许"包含"允许"，当前逻辑无法检测
        candidates = [
            _candidate("学校允许转专业", "rag"),
            _candidate("学校不允许转专业", "web"),
        ]
        result = strategy.rank(candidates, query="转专业", scene_hint="policy")
        assert "_conflict_hint" not in result[0].metadata

    def test_no_conflict_when_same_direction(self) -> None:
        strategy = ConflictDetectStrategy()
        candidates = [
            _candidate("学校支持转专业", "rag"),
            _candidate("学校支持转专业", "web"),
        ]
        result = strategy.rank(candidates, query="转专业", scene_hint="policy")
        assert "_conflict_hint" not in result[0].metadata

    def test_no_conflict_single_source(self) -> None:
        strategy = ConflictDetectStrategy()
        candidates = [_candidate("内容", "rag")]
        result = strategy.rank(candidates, query="test", scene_hint="general")
        assert "_conflict_hint" not in result[0].metadata

    def test_name_and_order(self) -> None:
        strategy = ConflictDetectStrategy()
        assert strategy.name == "conflict_detect_v1"
        assert strategy.order == 400


class TestSourcePriorityRegistry:
    def test_returns_strategies_in_order(self) -> None:
        registry = SourcePriorityRegistry()
        s1 = AuthorityBoostStrategy()
        s2 = TimeDecayStrategy()
        s3 = SourceWeightStrategy()
        registry.register(s3)
        registry.register(s1)
        registry.register(s2)
        ordered = registry.get_enabled_ordered()
        assert [s.name for s in ordered] == [
            "authority_boost_v1",
            "time_decay_v1",
            "source_weight_v1",
        ]

    def test_get_by_name(self) -> None:
        registry = SourcePriorityRegistry()
        strategy = AuthorityBoostStrategy()
        registry.register(strategy)
        assert registry.get("authority_boost_v1") is strategy

    def test_get_unknown_name_raises(self) -> None:
        registry = SourcePriorityRegistry()
        with pytest.raises(ValueError, match="not found"):
            registry.get("nonexistent")
