from __future__ import annotations

import json
import logging
from typing import Any, Optional

from .base_annotator import BaseChunkAnnotator, ChunkAnnotation

logger = logging.getLogger(__name__)

_ANNOTATION_PROMPT = """你是一个文档元数据标注器。根据以下切片文本，提取结构化元数据。

返回 JSON 格式：
{
  "type": "policy" | "product" | "general",
  "authority": "official" | "secondary",
  "effective_date": "YYYY-MM-DD" | "",
  "confidence": 0.0~1.0
}

规则：
- policy: 政策法规、通知、办法、规定等
- product: 产品功能、操作指南、技术文档等
- official: 有明确的政府机构、学校官方发文
- secondary: 第三方解读、非官方来源
- effective_date: 尽量提取文档中提到的日期
- confidence: 你对判断的置信度

切片文本：
{text}"""


class LlmAnnotator(BaseChunkAnnotator):
    """第三层：大模型语义标注，继承 Agent 模式，使用当前 LLM provider。"""

    name = "llm_v1"

    def __init__(self, provider: Any = None) -> None:
        self._provider = provider

    def annotate(self, text: str, existing: Optional[ChunkAnnotation] = None) -> ChunkAnnotation:
        ann = existing or ChunkAnnotation()

        if self._provider is None:
            ann.source = "llm_skip"
            return ann

        import asyncio

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, self._annotate_async(text, ann))
                return future.result(timeout=30)
        else:
            import asyncio

            return asyncio.run(self._annotate_async(text, ann))

    async def _annotate_async(self, text: str, ann: ChunkAnnotation) -> ChunkAnnotation:
        from llm.chat_message import ChatMessage

        prompt = _ANNOTATION_PROMPT.format(text=text[:1500])
        messages = [ChatMessage(role="user", content=prompt)]

        try:
            response_text = ""
            async for chunk in self._provider.stream_chat(
                messages, response_format={"type": "json_object"}
            ):
                response_text += chunk

            data = json.loads(response_text)
            if isinstance(data, dict):
                ann.type = data.get("type", ann.type)
                ann.authority = data.get("authority", ann.authority)
                ann.effective_date = data.get("effective_date", ann.effective_date)
                ann.confidence = float(data.get("confidence", 0.5))
        except Exception:
            logger.warning("LLM 标注失败，使用已有结果", exc_info=True)

        ann.source = "llm"
        return ann
