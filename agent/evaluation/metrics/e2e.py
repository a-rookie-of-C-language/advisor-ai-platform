from __future__ import annotations

import logging
import os
from typing import Any

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
    llm_provider: Any = None,
) -> dict[str, Any]:
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
        from tools.tool_permission import PermissionConfig, ToolPermission

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


def _build_eval_provider_from_env() -> Any:
    """从 .env 构建评估专用 LLM provider。"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    api_key = os.getenv("EVAL_LLM_API_KEY", "").strip()
    model = os.getenv("EVAL_LLM_MODEL", "").strip()

    if not api_key or not model:
        return None

    from llm.openai_provider import OpenAIProvider

    base_url = os.getenv("EVAL_LLM_BASE_URL", "").strip() or None
    temperature = float(os.getenv("EVAL_LLM_TEMPERATURE", "0.1"))

    logger.info("已配置评估专用 LLM: model=%s", model)
    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
    )
