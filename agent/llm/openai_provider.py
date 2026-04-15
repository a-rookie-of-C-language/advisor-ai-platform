from __future__ import annotations

from typing import AsyncIterator, Iterable

from openai import AsyncOpenAI

from llm.base_provider import BaseLLMProvider, ChatMessage


class OpenAIProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
        temperature: float = 0.2,
        timeout: float = 60.0,
    ) -> None:
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
        )
        self._model = model
        self._temperature = temperature

    async def stream_chat(self, messages: Iterable[ChatMessage]) -> AsyncIterator[str]:
        payload = [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]

        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=payload,
            temperature=self._temperature,
            stream=True,
        )

        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
