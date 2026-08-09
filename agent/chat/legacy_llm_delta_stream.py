from __future__ import annotations

from collections.abc import AsyncIterator, Callable, Iterable

from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage


async def stream_legacy_llm_data(
    provider: BaseLLMProvider,
    model_messages: Iterable[ChatMessage],
    answer_buffer: ChatStreamAnswerBuffer,
    serialize_protocol_event: Callable[..., str],
    trace_id: str | None,
) -> AsyncIterator[str]:
    async for delta in provider.stream_chat(model_messages):
        answer_buffer.append(delta)
        yield serialize_protocol_event(
            event="llm_data",
            source="llm",
            trace_id=trace_id,
            payload={"text": delta},
        )
