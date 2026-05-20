from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI

from context.memory.core.schema import MemoryCandidate


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
            "You are a memory extraction expert. Extract user facts worth long-term memory from the dialogue.\n"
            "\n"
            "Rules:\n"
            "1. Keep only stable and durable user traits (preference, goal, constraint, identity).\n"
            "2. Ignore temporary, one-off, or already-resolved issues.\n"
            "3. Each memory must include confidence in [0,1].\n"
            "4. Use tags.type in preference/goal/constraint/identity/other.\n"
            "5. Return at most 8 items sorted by importance.\n"
            "\n"
            "Return strict JSON array only, no extra text:\n"
            "[{\"content\": \"memory text\", \"confidence\": 0.8, \"tags\": {\"type\": \"preference\"}}]\n"
            "\n"
            f"[User] {user_text}\n"
            f"[Assistant] {assistant_text}\n"
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
        """解析 LLM 返回的 JSON 数组，增强容错能力"""
        text = text.strip()

        # 去掉 markdown 代码块
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()

        # 方案1: 直接解析（大多数情况）
        try:
            data = json.loads(text)
            if isinstance(data, list):
                return [item for item in data if isinstance(item, dict)]
        except json.JSONDecodeError:
            pass

        # 方案2: 流式 JSONDecoder，从头尝试解析到可解析位置
        decoder = json.JSONDecoder()
        try:
            obj, _ = decoder.raw_decode(text)
            if isinstance(obj, list):
                return [item for item in obj if isinstance(item, dict)]
        except json.JSONDecodeError:
            pass

        # 方案3: 提取所有完整的 JSON 对象（最宽松的兜底）
        return OpenAILLMExtractor._extract_objects(text)

    @staticmethod
    def _extract_objects(text: str) -> list[dict[str, Any]]:
        """从任意文本中提取所有完整的 JSON 对象"""
        result = []
        depth = 0
        start = None

        for i, ch in enumerate(text):
            if ch == "{":
                if depth == 0:
                    start = i
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0 and start is not None:
                    try:
                        obj = json.loads(text[start : i + 1])
                        if isinstance(obj, dict):
                            result.append(obj)
                    except json.JSONDecodeError:
                        pass
                    start = None

        return result