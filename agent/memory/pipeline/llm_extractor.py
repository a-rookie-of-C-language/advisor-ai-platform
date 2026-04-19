from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI

from memory.core.schema import MemoryCandidate


class OpenAILLMExtractor:
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout)
        self._model = model

    async def __call__(self, user_text: str, assistant_text: str) -> list[MemoryCandidate]:
        prompt = (
            "你是一个记忆提取专家。从对话中提取值得长期记住的用户信息。\n"
            "\n"
            "提取规则：\n"
            "1. 只提取稳定的、长期有效的用户特征（偏好、目标、约束、身份信息）\n"
            "2. 忽略临时性、一次性、已解决的问题\n"
            "3. 每条记忆要有明确的置信度(0-1)，事实性高的给高分\n"
            "4. tags中标记类型: preference/goal/constraint/identity/其他\n"
            "5. 最多提取5条，按重要性排序\n"
            "\n"
            "返回严格JSON数组，不要其他文字：\n"
            '[{"content": "记忆内容", "confidence": 0.8, "tags": {"type": "preference"}}]\n'
            "\n"
            f"[用户] {user_text}\n"
            f"[助手] {assistant_text}\n"
        )

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            stream=False,
        )

        content = response.choices[0].message.content if response.choices else "[]"
        raw = self._parse_json_array(content or "[]")

        candidates: list[MemoryCandidate] = []
        for item in raw:
            text = str(item.get("content", "")).strip()
            if not text:
                continue
            confidence = float(item.get("confidence", 0.7))
            confidence = max(0.0, min(confidence, 1.0))
            tags = item.get("tags") if isinstance(item.get("tags"), dict) else {}
            tags = {**tags, "source": "llm"}
            candidates.append(MemoryCandidate(content=text, confidence=confidence, tags=tags))
        return candidates

    @staticmethod
    def _parse_json_array(text: str) -> list[dict[str, Any]]:
        text = text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()

        try:
            data = json.loads(text)
            if isinstance(data, list):
                return [item for item in data if isinstance(item, dict)]
        except json.JSONDecodeError:
            pass

        left = text.find("[")
        right = text.rfind("]")
        if left >= 0 and right > left:
            try:
                data = json.loads(text[left : right + 1])
                if isinstance(data, list):
                    return [item for item in data if isinstance(item, dict)]
            except json.JSONDecodeError:
                return []
        return []
