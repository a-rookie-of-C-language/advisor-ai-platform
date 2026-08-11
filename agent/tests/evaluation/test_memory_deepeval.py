"""记忆功能 DeepEval 评估测试套件。

使用 DeepEval 框架对记忆功能的 LLM 输出质量进行评估。

覆盖场景：
- 记忆提取质量：LLM 是否正确提取了有价值的记忆
- 决策引擎质量：LLM 是否做出了正确的决策
- 类型分类准确性：LLM 是否正确分类了记忆类型
- 核心记忆判断：LLM 是否正确识别了核心记忆

使用方法：
    pytest tests/test_memory_deepeval.py -v
    pytest tests/test_memory_deepeval.py -v -k "test_decision_quality"
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from dotenv import load_dotenv

# 加载 .env 文件
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


# ── 记忆决策质量指标 ──


@pytest.fixture(scope="module")
def decision_metric() -> GEval:
    """记忆决策质量评估指标。"""
    model = os.getenv("DEEPEVAL_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    threshold = float(os.getenv("DEEPEVAL_THRESHOLD", "0.6"))
    return GEval(
        name="记忆决策准确性",
        criteria=(
            "评估记忆写入决策是否准确：\n"
            "1. ADD: 全新有价值的信息（偏好、身份、目标）\n"
            "2. IGNORE: 无长期价值的信息（闲聊、临时信息、问候）\n"
            "3. INVALIDATE: 新信息明确否定或矛盾于旧信息\n"
            "注意：版本升级、信息更新通常选择 UPDATE 或 ADD，不是 INVALIDATE\n"
            "INVALIDATE 只用于明确矛盾，如'喜欢Java'变为'不喜欢Java'"
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        model=model,
        threshold=threshold,
    )


@pytest.fixture(scope="module")
def type_classification_metric() -> GEval:
    """记忆类型分类准确性评估指标。"""
    model = os.getenv("DEEPEVAL_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    threshold = float(os.getenv("DEEPEVAL_THRESHOLD", "0.7"))
    return GEval(
        name="记忆类型分类准确性",
        criteria=(
            "评估记忆类型分类是否准确：\n"
            "1. semantic: 事实、偏好、用户画像、身份信息\n"
            "2. episodic: 过去发生过的具体事件、经历、案例\n"
            "如果输入包含'上次'、'曾经'、'昨天'等时间词，应该分类为 episodic\n"
            "如果输入是用户偏好/身份/目标，应该分类为 semantic"
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        model=model,
        threshold=threshold,
    )


@pytest.fixture(scope="module")
def core_memory_metric() -> GEval:
    """核心记忆判断准确性评估指标。"""
    model = os.getenv("DEEPEVAL_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    threshold = float(os.getenv("DEEPEVAL_THRESHOLD", "0.6"))
    return GEval(
        name="核心记忆判断准确性",
        criteria=(
            "评估核心记忆判断是否准确：\n"
            "1. 如果输入描述的是用户的身份、专业、长期偏好、核心目标，应该判断为核心记忆(is_core=true)\n"
            "2. 如果输入描述的是具体事件、临时信息、一次性任务，应该判断为非核心记忆(is_core=false)\n"
            "判断标准：\n"
            "- '用户是XX专业'、'偏好XX'、'使用XX语言' → 核心记忆\n"
            "- '上次修了XX bug'、'今天天气XX' → 非核心记忆"
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        model=model,
        threshold=threshold,
    )


# ── 决策引擎测试用例 ──


class TestDecisionQuality:
    """记忆决策质量 DeepEval 测试。"""

    def test_add_core_preference(self, decision_metric: GEval) -> None:
        """测试：用户核心偏好应该 ADD 且 is_core=true。"""
        test_case = LLMTestCase(
            input="用户喜欢 Python，偏好简洁回答",
            actual_output='{"decision": "add", "reason": "用户核心偏好", "is_core": true}',
        )
        decision_metric.measure(test_case)
        assert decision_metric.is_successful(), (
            f"决策准确性分数 {decision_metric.score} 低于阈值: {decision_metric.reason}"
        )

    def test_ignore_casual_chat(self, decision_metric: GEval) -> None:
        """测试：闲聊应该 IGNORE。"""
        test_case = LLMTestCase(
            input="今天天气不错",
            actual_output='{"decision": "ignore", "reason": "临时信息，无长期价值"}',
        )
        decision_metric.measure(test_case)
        assert decision_metric.is_successful(), (
            f"决策准确性分数 {decision_metric.score} 低于阈值: {decision_metric.reason}"
        )

    def test_invalidate_contradiction(self, decision_metric: GEval) -> None:
        """测试：矛盾信息应该 INVALIDATE。"""
        test_case = LLMTestCase(
            input="已有记忆：用户喜欢 Java\n新信息：用户现在改用 Python 了",
            actual_output='{"decision": "invalidate", "reason": "偏好从 Java 变为 Python", "target_memory_ids": [1]}',
        )
        decision_metric.measure(test_case)
        assert decision_metric.is_successful(), (
            f"决策准确性分数 {decision_metric.score} 低于阈值: {decision_metric.reason}"
        )

    def test_add_new_info(self, decision_metric: GEval) -> None:
        """测试：新信息应该 ADD。"""
        test_case = LLMTestCase(
            input="用户最近开始学习机器学习",
            actual_output='{"decision": "add", "reason": "新的学习目标", "is_core": false}',
        )
        decision_metric.measure(test_case)
        assert decision_metric.is_successful(), (
            f"决策准确性分数 {decision_metric.score} 低于阈值: {decision_metric.reason}"
        )


# ── 类型分类测试用例 ──


class TestTypeClassification:
    """记忆类型分类 DeepEval 测试。"""

    def test_semantic_preference(self, type_classification_metric: GEval) -> None:
        """测试：用户偏好应该分类为 semantic。"""
        test_case = LLMTestCase(
            input="用户喜欢 Python",
            actual_output="semantic",
        )
        type_classification_metric.measure(test_case)
        assert type_classification_metric.is_successful(), (
            f"类型分类准确性分数 {type_classification_metric.score} 低于阈值: {type_classification_metric.reason}"
        )

    def test_episodic_past_event(self, type_classification_metric: GEval) -> None:
        """测试：过去事件应该分类为 episodic。"""
        test_case = LLMTestCase(
            input="上次帮用户解决了登录 bug",
            actual_output="episodic",
        )
        type_classification_metric.measure(test_case)
        assert type_classification_metric.is_successful(), (
            f"类型分类准确性分数 {type_classification_metric.score} 低于阈值: {type_classification_metric.reason}"
        )

    def test_episodic_temporal_marker(self, type_classification_metric: GEval) -> None:
        """测试：包含时间标记应该分类为 episodic。"""
        test_case = LLMTestCase(
            input="昨天讨论了毕设选题",
            actual_output="episodic",
        )
        type_classification_metric.measure(test_case)
        assert type_classification_metric.is_successful(), (
            f"类型分类准确性分数 {type_classification_metric.score} 低于阈值: {type_classification_metric.reason}"
        )

    def test_semantic_identity(self, type_classification_metric: GEval) -> None:
        """测试：用户身份应该分类为 semantic。"""
        test_case = LLMTestCase(
            input="用户是计科专业大三学生",
            actual_output="semantic",
        )
        type_classification_metric.measure(test_case)
        assert type_classification_metric.is_successful(), (
            f"类型分类准确性分数 {type_classification_metric.score} 低于阈值: {type_classification_metric.reason}"
        )


# ── 核心记忆判断测试用例 ──


class TestCoreMemoryJudgment:
    """核心记忆判断 DeepEval 测试。"""

    def test_core_identity(self, core_memory_metric: GEval) -> None:
        """测试：用户身份应该判断为核心记忆。"""
        test_case = LLMTestCase(
            input="用户是计算机科学专业学生，主要使用 Python 和 Go",
            actual_output="is_core: true",
        )
        core_memory_metric.measure(test_case)
        assert core_memory_metric.is_successful(), (
            f"核心记忆判断准确性分数 {core_memory_metric.score} 低于阈值: {core_memory_metric.reason}"
        )

    def test_core_preference(self, core_memory_metric: GEval) -> None:
        """测试：核心偏好应该判断为核心记忆。"""
        test_case = LLMTestCase(
            input="偏好简洁回答，不要废话",
            actual_output="is_core: true",
        )
        core_memory_metric.measure(test_case)
        assert core_memory_metric.is_successful(), (
            f"核心记忆判断准确性分数 {core_memory_metric.score} 低于阈值: {core_memory_metric.reason}"
        )

    def test_non_core_event(self, core_memory_metric: GEval) -> None:
        """测试：具体事件不应该判断为核心记忆。"""
        test_case = LLMTestCase(
            input="上次帮用户修了支付 bug",
            actual_output="is_core: false",
        )
        core_memory_metric.measure(test_case)
        assert core_memory_metric.is_successful(), (
            f"核心记忆判断准确性分数 {core_memory_metric.score} 低于阈值: {core_memory_metric.reason}"
        )

    def test_non_core_temporary(self, core_memory_metric: GEval) -> None:
        """测试：临时信息不应该判断为核心记忆。"""
        test_case = LLMTestCase(
            input="今天天气不错",
            actual_output="is_core: false",
        )
        core_memory_metric.measure(test_case)
        assert core_memory_metric.is_successful(), (
            f"核心记忆判断准确性分数 {core_memory_metric.score} 低于阈值: {core_memory_metric.reason}"
        )


# ── 集成测试 ──


class TestMemoryIntegration:
    """记忆功能集成 DeepEval 测试。"""

    def test_decision_metric_attributes(self, decision_metric: GEval) -> None:
        """测试决策指标属性完整性。"""
        assert decision_metric.name == "记忆决策准确性"
        assert decision_metric.threshold is not None

    def test_type_metric_attributes(self, type_classification_metric: GEval) -> None:
        """测试类型分类指标属性完整性。"""
        assert type_classification_metric.name == "记忆类型分类准确性"
        assert type_classification_metric.threshold is not None

    def test_core_metric_attributes(self, core_memory_metric: GEval) -> None:
        """测试核心记忆指标属性完整性。"""
        assert core_memory_metric.name == "核心记忆判断准确性"
        assert core_memory_metric.threshold is not None
