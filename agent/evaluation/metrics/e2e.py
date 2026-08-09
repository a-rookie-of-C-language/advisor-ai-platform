from __future__ import annotations

import logging
import os

from json_types import JsonObject
from llm.base_provider import BaseLLMProvider

logger = logging.getLogger(__name__)

_JUDGE_PROMPT = """你是一个评估专家。请对以下回答进行评分。

问题：{query}

期望答案：{expected_answer}

实际答案：{actual_answer}

请从以下四个维度评分（1-5分）：
- relevance（相关性）：回答是否与问题相关
- completeness（完整性）：回答是否涵盖了期望答案的要点
- accuracy（准确性）：回答是否准确无误
- fluency（流畅性）：回答是否通顺、易读

返回 JSON 格式：
{{
  "relevance": 1-5,
  "completeness": 1-5,
  "accuracy": 1-5,
  "fluency": 1-5,
  "reasoning": "评分理由"
}}"""


async def e2e_judge_score(
    query: str,
    expected_answer: str,
    actual_answer: str,
    llm_provider: BaseLLMProvider | None = None,
) -> JsonObject:
    """使用 LLM-as-Judge 对端到端回答质量打分。

    Args:
        query: 用户问题
        expected_answer: 期望答案
        actual_answer: 实际答案
        llm_provider: LLM provider（可选，不传则使用环境变量配置）

    Returns:
        包含各维度分数和加权总分的字典
    """
    if llm_provider is None:
        llm_provider = _build_eval_provider_from_env()

    if llm_provider is None:
        logger.warning("未配置 EVAL LLM provider，跳过 e2e 评估")
        return {"error": "no_llm_provider", "avg_score": 0.0}

    prompt = _JUDGE_PROMPT.format(
        query=query,
        expected_answer=expected_answer,
        actual_answer=actual_answer,
    )

    try:
        from agents.base.agent import Agent
        from tools.permissions.tool_permission import PermissionConfig, ToolPermission

        # 创建临时 agent 用于调用 LLM
        agent = Agent(
            name="eval_judge",
            llm_provider=llm_provider,
            permission_config=PermissionConfig.from_allowed_tools({ToolPermission.LLM}),
        )
        messages = [{"role": "user", "content": prompt}]
        data = await agent.call_llm_json(messages)

        relevance = float(data.get("relevance", 3))
        completeness = float(data.get("completeness", 3))
        accuracy = float(data.get("accuracy", 3))
        fluency = float(data.get("fluency", 3))

        # 加权平均（relevance 和 accuracy 权重更高）
        avg_score = (relevance * 0.3 + completeness * 0.25 + accuracy * 0.3 + fluency * 0.15)

        return {
            "relevance": relevance,
            "completeness": completeness,
            "accuracy": accuracy,
            "fluency": fluency,
            "avg_score": round(avg_score, 2),
            "reasoning": data.get("reasoning", ""),
        }
    except Exception as exc:
        logger.warning("e2e judge 评分失败: %s", exc)
        return {"error": str(exc), "avg_score": 0.0}


def _build_eval_provider_from_env() -> BaseLLMProvider:
    """从 .env 构建评估专用 LLM provider，优先读取 EVAL_*，缺失时回退 OPENAI_*。"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    api_key = os.getenv("EVAL_LLM_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("EVAL_LLM_MODEL", "").strip() or os.getenv("OPENAI_MODEL", "").strip()
    base_url = os.getenv("EVAL_LLM_BASE_URL", "").strip() or os.getenv("OPENAI_BASE_URL", "").strip()

    if not api_key:
        raise RuntimeError("Missing EVAL_LLM_API_KEY and OPENAI_API_KEY")
    if not model:
        raise RuntimeError("Missing EVAL_LLM_MODEL and OPENAI_MODEL")
    if not base_url:
        raise RuntimeError("Missing EVAL_LLM_BASE_URL and OPENAI_BASE_URL")

    from llm.openai_provider import OpenAIProvider

    temperature = float(os.getenv("EVAL_LLM_TEMPERATURE", "0.1"))

    logger.info("已配置评估专用 LLM: model=%s", model)
    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
    )


def e2e_deepeval_score(
    query: str,
    expected_answer: str,
    actual_answer: str,
    retrieval_context: list[str] | None = None,
) -> JsonObject:
    """使用 DeepEval 进行端到端评估。

    评估维度：
    - RAG 质量：忠实度、答案相关性、上下文精度、上下文召回
    - 安全性：幻觉、偏见、毒性
    - 回答质量：相关性、连贯性

    Args:
        query: 用户问题
        expected_answer: 期望答案
        actual_answer: 实际答案
        retrieval_context: RAG 检索到的上下文列表（可选）

    Returns:
        包含各指标评分和加权总分的字典
    """
    try:
        from .deepeval_metrics import DeepEvalMetrics

        metrics = DeepEvalMetrics()
        test_case = metrics.create_test_case(
            input_query=query,
            actual_output=actual_answer,
            expected_output=expected_answer,
            retrieval_context=retrieval_context,
        )

        results = metrics.evaluate_all(test_case)

        # 计算加权平均分
        weights = {
            "Faithfulness": 0.20,
            "Answer Relevancy": 0.20,
            "Relevance": 0.20,
            "Coherence": 0.15,
            "Hallucination": 0.10,
            "Bias": 0.075,
            "Toxicity": 0.075,
        }

        weighted_sum = 0.0
        total_weight = 0.0
        for name, weight in weights.items():
            if name in results:
                weighted_sum += results[name]["score"] * weight
                total_weight += weight

        avg_score = weighted_sum / total_weight if total_weight > 0 else 0.0

        return {
            "metrics": results,
            "avg_score": round(avg_score, 4),
            "method": "deepeval",
        }
    except Exception as exc:
        logger.warning("DeepEval 评估失败: %s", exc)
        return {"error": str(exc), "avg_score": 0.0, "method": "deepeval"}
