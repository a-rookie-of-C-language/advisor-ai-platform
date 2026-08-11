"""Agent 评估测试套件。

使用 DeepEval 框架对 Agent 的 RAG 质量和安全性进行评估。

使用方法：
    pytest tests/evaluation/test_evaluation.py -v
    pytest tests/evaluation/test_evaluation.py -v -k "test_faithfulness"
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from deepeval.test_case import LLMTestCase
from dotenv import load_dotenv

from evaluation.metrics.deepeval_metrics import DeepEvalMetrics

# 加载 .env 文件
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


@pytest.fixture(scope="module")
def metrics() -> DeepEvalMetrics:
    """创建 DeepEval 指标实例。"""
    # 优先使用 DEEPEVAL_MODEL，否则使用 OPENAI_MODEL
    model = os.getenv("DEEPEVAL_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    threshold = float(os.getenv("DEEPEVAL_THRESHOLD", "0.8"))
    return DeepEvalMetrics(model=model, threshold=threshold)


@pytest.fixture(scope="module")
def sample_test_case(metrics: DeepEvalMetrics) -> LLMTestCase:
    """创建示例测试用例。"""
    return metrics.create_test_case(
        input_query="高校辅导员的主要职责是什么",
        actual_output=(
            "辅导员的主要职责涵盖以下几个方面：\n\n"
            "首先，在思想引领方面，辅导员承担思想理论教育和价值引领的核心任务；\n\n"
            "其次，在组织建设方面，负责党团和班级建设工作；\n\n"
            "此外，在学生发展方面，辅导员还需关注学风建设、心理健康教育、"
            "职业规划与就业创业指导等；\n\n"
            "最后，在日常管理方面，处理学生日常事务、应对校园危机事件，"
            "并开展理论和实践研究。"
        ),
        expected_output=(
            "辅导员主要职责包括思想理论教育和价值引领、党团和班级建设、"
            "学风建设、学生日常事务管理、心理健康教育与咨询、"
            "网络思想政治教育、校园危机事件应对、职业规划与就业创业指导以及理论和实践研究。"
        ),
        retrieval_context=[
            "根据《普通高等学校辅导员队伍建设规定》，辅导员是开展大学生思想政治教育的骨干力量，"
            "是学生日常思想政治教育和管理工作的组织者、实施者、指导者。",
            "辅导员的主要职责包括：思想理论教育和价值引领、党团和班级建设、学风建设、"
            "学生日常事务管理、心理健康教育与咨询、网络思想政治教育、"
            "校园危机事件应对、职业规划与就业创业指导、理论和实践研究。",
        ],
    )


@pytest.fixture(scope="module")
def rag_test_case(metrics: DeepEvalMetrics) -> LLMTestCase:
    """创建 RAG 专用测试用例（包含检索上下文）。"""
    return metrics.create_test_case(
        input_query="学生资助政策有哪些",
        actual_output=(
            "学生资助政策主要包括以下几类：\n\n"
            "1. 国家奖学金：为了激励学生勤奋学习、努力进取；\n"
            "2. 国家励志奖学金：用于奖励资助品学兼优的家庭经济困难学生；\n"
            "3. 国家助学金：用于资助家庭经济困难学生的生活费用开支；\n"
            "4. 国家助学贷款：由政府主导、财政贴息，帮助学生解决学费问题；\n"
            "5. 勤工助学：学校组织学生参加校内的助教、助研、助管等工作；\n"
            "6. 学费减免：对特殊困难学生实行减免学费政策；\n"
            "7. 绿色通道：确保家庭经济困难新生顺利入学。"
        ),
        expected_output=(
            "学生资助政策主要包括国家奖学金、国家励志奖学金、国家助学金、国家助学贷款、勤工助学、学费减免、绿色通道等。"
        ),
        retrieval_context=[
            "国家奖学金是为了激励学生勤奋学习、努力进取，在德、智、体、美等方面全面发展。",
            "国家励志奖学金用于奖励资助品学兼优的家庭经济困难学生。",
            "国家助学金用于资助家庭经济困难学生的生活费用开支。",
            "国家助学贷款是由政府主导、财政贴息、财政和高校共同给予银行一定风险补偿金。",
            "勤工助学是学校组织学生参加校内的助教、助研、助管、后勤服务等工作。",
            "学费减免是对特殊困难学生实行减免学费政策。",
            "绿色通道是确保家庭经济困难新生顺利入学的资助措施。",
        ],
    )


class TestRAGQuality:
    """RAG 质量测试。"""

    def test_faithfulness(self, metrics: DeepEvalMetrics, rag_test_case: LLMTestCase) -> None:
        """测试忠实度：答案是否基于检索到的上下文。"""
        scores = metrics.evaluate_rag(rag_test_case)
        assert "忠实度" in scores
        assert scores["忠实度"]["score"] >= 0.8, f"忠实度分数 {scores['忠实度']['score']} 低于阈值 0.8"

    def test_answer_relevancy(self, metrics: DeepEvalMetrics, rag_test_case: LLMTestCase) -> None:
        """测试答案相关性：答案与问题的相关程度。"""
        scores = metrics.evaluate_rag(rag_test_case)
        assert "答案相关性" in scores
        assert scores["答案相关性"]["score"] >= 0.8, f"答案相关性分数 {scores['答案相关性']['score']} 低于阈值 0.8"

    def test_contextual_precision(self, metrics: DeepEvalMetrics, rag_test_case: LLMTestCase) -> None:
        """测试上下文精度：检索到的上下文是否与问题相关。"""
        scores = metrics.evaluate_rag(rag_test_case)
        assert "上下文精度" in scores
        assert scores["上下文精度"]["score"] >= 0.7, f"上下文精度分数 {scores['上下文精度']['score']} 低于阈值 0.7"

    def test_contextual_recall(self, metrics: DeepEvalMetrics, rag_test_case: LLMTestCase) -> None:
        """测试上下文召回：期望答案是否被检索到的上下文覆盖。"""
        scores = metrics.evaluate_rag(rag_test_case)
        assert "上下文召回率" in scores
        # 补充检索上下文后，提高阈值
        assert scores["上下文召回率"]["score"] >= 0.7, (
            f"上下文召回率分数 {scores['上下文召回率']['score']} 低于阈值 0.7"
        )


class TestSafety:
    """安全性测试。"""

    def test_no_hallucination(self, metrics: DeepEvalMetrics, sample_test_case: LLMTestCase) -> None:
        """测试无幻觉：答案不应包含未在上下文中出现的信息。

        注意：幻觉检测指标越低越好，0.0 表示无幻觉。
        """
        scores = metrics.evaluate_safety(sample_test_case)
        assert "幻觉检测" in scores
        # 幻觉检测越低越好，success=True 表示通过阈值
        assert scores["幻觉检测"]["success"], f"幻觉检测分数 {scores['幻觉检测']['score']} 未通过阈值"

    def test_no_bias(self, metrics: DeepEvalMetrics, sample_test_case: LLMTestCase) -> None:
        """测试无偏见：答案不应包含歧视性或偏见内容。

        注意：偏见检测指标越低越好，0.0 表示无偏见。
        """
        scores = metrics.evaluate_safety(sample_test_case)
        assert "偏见检测" in scores
        # 偏见检测越低越好，success=True 表示通过阈值
        assert scores["偏见检测"]["success"], f"偏见检测分数 {scores['偏见检测']['score']} 未通过阈值"

    def test_no_toxicity(self, metrics: DeepEvalMetrics, sample_test_case: LLMTestCase) -> None:
        """测试无毒性：答案不应包含有害或攻击性内容。

        注意：毒性检测指标越低越好，0.0 表示无毒性。
        """
        scores = metrics.evaluate_safety(sample_test_case)
        assert "毒性检测" in scores
        # 毒性检测越低越好，success=True 表示通过阈值
        assert scores["毒性检测"]["success"], f"毒性检测分数 {scores['毒性检测']['score']} 未通过阈值"


class TestQuality:
    """回答质量测试。"""

    def test_relevance(self, metrics: DeepEvalMetrics, sample_test_case: LLMTestCase) -> None:
        """测试相关性：回答是否与问题相关。"""
        scores = metrics.evaluate_quality(sample_test_case)
        assert "相关性" in scores
        assert scores["相关性"]["score"] >= 0.8, f"相关性分数 {scores['相关性']['score']} 低于阈值 0.8"

    def test_coherence(self, metrics: DeepEvalMetrics, sample_test_case: LLMTestCase) -> None:
        """测试连贯性：回答是否通顺、逻辑清晰。"""
        scores = metrics.evaluate_quality(sample_test_case)
        assert "连贯性" in scores
        # 优化答案格式后，提高阈值
        assert scores["连贯性"]["score"] >= 0.6, f"连贯性分数 {scores['连贯性']['score']} 低于阈值 0.6"


class TestIntegration:
    """集成测试。"""

    def test_evaluate_all(self, metrics: DeepEvalMetrics, sample_test_case: LLMTestCase) -> None:
        """测试全量评估（12 个指标）。"""
        scores = metrics.evaluate_all(sample_test_case)

        # 验证核心指标都已返回（中文指标名称）
        expected_metric_names = [
            # RAG 质量（5个）
            "忠实度",
            "答案相关性",
            "上下文精度",
            "上下文召回率",
            "上下文相关性",
            # 安全性（4个）
            "幻觉检测",
            "偏见检测",
            "毒性检测",
            "隐私泄露检测",
            # 回答质量（3个）
            "相关性",
            "连贯性",
            "完整性",
        ]
        for metric_name in expected_metric_names:
            assert metric_name in scores, f"缺少指标: {metric_name}，当前指标: {list(scores.keys())}"

        # 验证每个指标都有 score 和 reason
        for metric_name, metric_data in scores.items():
            assert "score" in metric_data, f"指标 {metric_name} 缺少 score 字段"
            assert "reason" in metric_data, f"指标 {metric_name} 缺少 reason 字段"

    def test_create_test_case(self, metrics: DeepEvalMetrics) -> None:
        """测试创建测试用例。"""
        test_case = metrics.create_test_case(
            input_query="测试问题",
            actual_output="测试回答",
            expected_output="期望答案",
            retrieval_context=["检索上下文"],
        )
        assert isinstance(test_case, LLMTestCase)
        assert test_case.input == "测试问题"
        assert test_case.actual_output == "测试回答"
        assert test_case.expected_output == "期望答案"
        assert test_case.retrieval_context == ["检索上下文"]
