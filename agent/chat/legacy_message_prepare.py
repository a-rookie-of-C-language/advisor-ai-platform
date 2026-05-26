from __future__ import annotations

from dataclasses import dataclass

from chat.stream_memory_context import ChatStreamMemoryContextSupport
from chat.stream_message_utils import last_user_message
from llm.chat_message import ChatMessage


@dataclass
class LegacyPreparedMessages:
    model_messages: list[ChatMessage]
    user_query: str
    memory_enabled: bool


async def prepare_legacy_messages(
    *,
    validated_messages: list[ChatMessage],
    user_id: int | None,
    session_id: int | None,
    memory_context_support: ChatStreamMemoryContextSupport,
) -> LegacyPreparedMessages:
    model_messages = list(validated_messages)
    user_query = last_user_message(validated_messages)
    memory_enabled = memory_context_support.is_enabled(
        user_id=user_id,
        session_id=session_id,
        user_query=user_query,
    )
    if memory_enabled:
        model_messages = await memory_context_support.inject_context(
            model_messages,
            validated_messages,
            user_id=user_id,
            session_id=session_id,
            user_query=user_query,
        )
    return LegacyPreparedMessages(
        model_messages=model_messages,
        user_query=user_query,
        memory_enabled=memory_enabled,
    )
