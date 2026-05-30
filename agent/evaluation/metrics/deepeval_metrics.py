"""DeepEval 评估指标封装。

提供 RAG 质量评估和安全评估的统一接口。
"""
from __future__ import annotations

import logging
from typing import Any

from deepeval import evaluate
from deepeval.evaluate.configs import AsyncConfig
from deepeval.metrics import (
    AnswerRelevancyMetric,
    BiasMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    FaithfulnessMetric,
    GEval,
    HallucinationMetric,
    ToxicityMetric,
)
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

logger = logging.getLogger(__name__)


class DeepEvalMetrics:
    """DeepEval 指标集合。

    Args:
        model: 评估使用的模型名称，默认 gpt-4o-mini
        threshold: 指标通过阈值，默认 0.8
    """

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        threshold: float = 0.8,
    ) -> None:
        self.model = model
        self.threshold = threshold
        self._init_metrics()

    def _init_metrics(self) -> None:
        """初始化所有指标。"""
        # RAG 质量指标
        self.faithfulness = FaithfulnessMetric(
            model=self.model,
            threshold=self.threshold,
        )
        self.answer_relevancy = AnswerRelevancyMetric(
            model=self.model,
            threshold=self.threshold,
        )
        self.contextual_precision = ContextualPrecisionMetric(
            model=self.model,
            threshold=self.threshold,
        )
        self.contextual_recall = ContextualRecallMetric(
            model=self.model,
            threshold=self.threshold,
        )

        # 安全指标
        self.hallucination = HallucinationMetric(
            model=self.model,
            threshold=self.threshold,
        )
        self.bias = BiasMetric(
            model=self.model,
            threshold=self.threshold,
        )
        self.toxicity = ToxicityMetric(
            model=self.model,
            threshold=self.threshold,
        )

        # 自定义 G-Eval 指标
        self.relevance = GEval(
            name="Relevance",
            criteria="评估回答与问题的相关程度，是否准确回答了用户的问题",
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=self.model,
            threshold=self.threshold,
        )
        self.coherence = GEval(
            name="Coherence",
            criteria="评估回答的连贯性和逻辑性，语句是否通顺、结构是否清晰",
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            model=self.model,
            threshold=self.threshold,
        )

    def create_test_case(
        self,
        input_query: str,
        actual_output: str,
        expected_output: str = "",
        retrieval_context: list[str] | None = None,
        context: list[str] | None = None,
    ) -> LLMTestCase:
        """创建 DeepEval 测试用例。

        Args:
            input_query: 用户输入的问题
            actual_output: Agent 的实际回答
            expected_output: 期望的标准答案（可选）
            retrieval_context: RAG 检索到的上下文列表（可选）
            context: 事实上下文列表（可选，用于幻觉检测）

        Returns:
            LLMTestCase 实例
        """
        return LLMTestCase(
            input=input_query,
            actual_output=actual_output,
            expected_output=expected_output,
            retrieval_context=retrieval_context or [],
            context=context or retrieval_context or [],
        )

    def evaluate_rag(self, test_case: LLMTestCase) -> dict[str, Any]:
        """评估 RAG 质量。

        评估指标：
        - Faithfulness: 忠实度，答案是否基于检索到的上下文
        - Answer Relevancy: 答案与问题的相关性
        - Contextual Precision: 上下文精度
        - Contextual Recall: 上下文召回率

        Args:
            test_case: 测试用例

        Returns:
            各指标的评分和原因
        """
        metrics = [
            self.faithfulness,
            self.answer_relevancy,
            self.contextual_precision,
            self.contextual_recall,
        ]
        results = evaluate([test_case], metrics, async_config=AsyncConfig(run_async=False))
        return self._extract_scores(results)

    def evaluate_safety(self, test_case: LLMTestCase) -> dict[str, Any]:
        """评估安全性。

        评估指标：
        - Hallucination: 幻觉检测
        - Bias: 偏见检测
        - Toxicity: 毒性检测

        Args:
            test_case: 测试用例

        Returns:
            各指标的评分和原因
        """
        metrics = [self.hallucination, self.bias, self.toxicity]
        results = evaluate([test_case], metrics, async_config=AsyncConfig(run_async=False))
        return self._extract_scores(results)

    def evaluate_quality(self, test_case: LLMTestCase) -> dict[str, Any]:
        """评估回答质量。

        评估指标：
        - Relevance: 相关性
        - Coherence: 连贯性

        Args:
            test_case: 测试用例

        Returns:
            各指标的评分和原因
        """
        metrics = [self.relevance, self.coherence]
        results = evaluate([test_case], metrics, async_config=AsyncConfig(run_async=False))
        return self._extract_scores(results)

    def evaluate_all(self, test_case: LLMTestCase) -> dict[str, Any]:
        """执行全部评估。

        包含 RAG 质量、安全性和回答质量的所有指标。

        Args:
            test_case: 测试用例

        Returns:
            所有指标的评分和原因
        """
        all_metrics = [
            # RAG 质量
            self.faithfulness,
            self.answer_relevancy,
            self.contextual_precision,
            self.contextual_recall,
            # 安全性
            self.hallucination,
            self.bias,
            self.toxicity,
            # 回答质量
            self.relevance,
            self.coherence,
        ]
        results = evaluate([test_case], all_metrics, async_config=AsyncConfig(run_async=False))
        return self._extract_scores(results)

    def _extract_scores(self, results: Any) -> dict[str, Any]:
        """从评估结果中提取分数。

        Args:
            results: DeepEval 评估结果

        Returns:
            包含各指标评分、原因和通过状态的字典
        """
        scores: dict[str, Any] = {}
        for test_result in results.test_results:
            for metric_data in test_result.metrics_data:
                scores[metric_data.name] = {
                    "score": metric_data.score,
                    "reason": metric_data.reason,
                    "success": metric_data.success,
                    "threshold": metric_data.threshold,
                }
        return scores
