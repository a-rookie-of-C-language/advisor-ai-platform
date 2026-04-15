from __future__ import annotations

import json
from typing import AsyncIterator, Iterable

from llm.base_provider import BaseLLMProvider, ChatMessage

_ALLOWED_ROLES = {"system", "user", "assistant"}


class ChatStreamService:
    def __init__(self, provider: BaseLLMProvider) -> None:
        self._provider = provider

    @staticmethod
    def _serialize_event(event: str, data: dict) -> str:
        return f"event: {event}\\ndata: {json.dumps(data, ensure_ascii=False)}\\n\\n"

    @staticmethod
    def _validate_messages(messages: Iterable[ChatMessage]) -> list[ChatMessage]:
        validated = []
        for message in messages:
            role = message.role.strip().lower()
            content = message.content.strip()
            if role not in _ALLOWED_ROLES:
                raise ValueError(f"Unsupported role: {message.role}")
            if not content:
                raise ValueError("Message content cannot be empty")
            validated.append(ChatMessage(role=role, content=content))

        if not validated:
            raise ValueError("messages cannot be empty")

        return validated

    async def stream_events(self, messages: Iterable[ChatMessage]) -> AsyncIterator[str]:
        validated_messages = self._validate_messages(messages)
        yield self._serialize_event("start", {"message": "stream_started"})

        try:
            async for delta in self._provider.stream_chat(validated_messages):
                yield self._serialize_event("delta", {"text": delta})
            yield self._serialize_event("end", {"message": "stream_finished"})
        except Exception as exc:  # noqa: BLE001
            yield self._serialize_event("error", {"message": str(exc)})
