from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

from agents.base.agent import Agent
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from tools.tool_permission import PermissionConfig, ToolPermission

from .ChunkAnnotation import ChunkAnnotation
from .base_annotator import BaseChunkAnnotator

logger = logging.getLogger(__name__)

_ANNOTATION_PROMPT = """你是一个文档元数据标注器。根据以下切片文本，提取结构化元数据。

返回 JSON 格式：
{{
  "type": "policy" | "product" | "general",
  "authority": "official" | "secondary",
  "effective_date": "YYYY-MM-DD" | "",
  "confidence": 0.0~1.0
}}

规则：
- policy: 政策法规、通知、办法、规定等
- product: 产品功能、操作指南、技术文档等
- official: 有明确的政府机构、学校官方发文
- secondary: 第三方解读、非官方来源
- effective_date: 尽量提取文档中提到的日期
- confidence: 你对判断的置信度

切片文本：
{text}"""


class LlmAnnotator(Agent, BaseChunkAnnotator):
    """第三层：大模型语义标注，继承 Agent，支持 .env 配置独立 LLM。

    环境变量（可选，不配则使用默认 provider）：
    - ANNOTATION_LLM_API_KEY:   专用 API Key
    - ANNOTATION_LLM_MODEL:     专用模型名
    - ANNOTATION_LLM_BASE_URL:  专用 API 地址
    """

    name = "llm_v1"

    def __init__(self, provider: BaseLLMProvider | None = None) -> None:
        resolved_provider = provider or _build_annotation_provider_from_env()
        Agent.__init__(
            self,
            name="llm_annotator",
            llm_provider=resolved_provider,
            permission_config=PermissionConfig.from_allowed_tools(
                {ToolPermission.LLM},
            ),
        )

    def annotate(self, text: str, existing: Optional[ChunkAnnotation] = None) -> ChunkAnnotation:
        ann = existing or ChunkAnnotation()

        if self._llm_provider is None:
            ann.source = "llm_skip"
            return ann

        # 在 async 上下文中调用父类的默认实现（使用 run_in_executor）
        try:
            loop = asyncio.get_running_loop()
            # 已在 async 上下文，直接返回 await
            return asyncio.run(self._annotate_async(text, ann))
        except RuntimeError:
            # 无 event loop，可以安全使用 asyncio.run
            return asyncio.run(self._annotate_async(text, ann))

    async def _annotate_async(self, text: str, ann: ChunkAnnotation) -> ChunkAnnotation:
        prompt = _ANNOTATION_PROMPT.format(text=text[:1500])
        messages = [{"role": "user", "content": prompt}]

        try:
            data = await self.call_llm_json(messages)
            ann.type = data.get("type", ann.type)
            ann.authority = data.get("authority", ann.authority)
            ann.effective_date = data.get("effective_date", ann.effective_date)
            ann.confidence = float(data.get("confidence", 0.5))
        except Exception:
            logger.warning("LLM 标注失败，使用已有结果", exc_info=True)

        ann.source = "llm"
        return ann

    async def run_once(self) -> JsonObject:
        raise NotImplementedError("LlmAnnotator 不支持 run_once，请使用 annotate()")

    async def run(self) -> None:
        raise NotImplementedError("LlmAnnotator 不支持 run，请使用 annotate()")


def _build_annotation_provider_from_env() -> BaseLLMProvider:
    """从 .env 构建标注专用 LLM provider，优先读取 ANNOTATION_*，缺失时回退 OPENAI_*。"""
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv("ANNOTATION_LLM_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("ANNOTATION_LLM_MODEL", "").strip() or os.getenv("OPENAI_MODEL", "").strip()
    base_url = os.getenv("ANNOTATION_LLM_BASE_URL", "").strip() or os.getenv("OPENAI_BASE_URL", "").strip()

    if not api_key:
        raise RuntimeError("Missing ANNOTATION_LLM_API_KEY and OPENAI_API_KEY")
    if not model:
        raise RuntimeError("Missing ANNOTATION_LLM_MODEL and OPENAI_MODEL")
    if not base_url:
        raise RuntimeError("Missing ANNOTATION_LLM_BASE_URL and OPENAI_BASE_URL")

    from llm.openai_provider import OpenAIProvider

    temperature = float(os.getenv("ANNOTATION_LLM_TEMPERATURE", "0.1"))
    timeout = float(os.getenv("ANNOTATION_LLM_TIMEOUT_SEC", "30"))

    logger.info("已配置标注专用 LLM: model=%s, base_url=%s", model, base_url or "default")
    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
        timeout=timeout,
    )
