from __future__ import annotations

from collections.abc import AsyncIterator, Callable

from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer
from chat.plain_stream_adapter import stream_plain_chat_protocol_events
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage


async def stream_legacy_plain_chat(
    *,
    provider: BaseLLMProvider,
    model_messages: list[ChatMessage],
    answer_buffer: ChatStreamAnswerBuffer,
    serialize_protocol_event: Callable[..., str],
    trace_id: str | None,
) -> AsyncIterator[str]:
    async for plain_event in stream_plain_chat_protocol_events(
        provider=provider,
        model_messages=model_messages,
    ):
        event_name = str(plain_event["event"])
        payload = plain_event["payload"]
        if event_name == "llm_data":
            answer_buffer.append(str(payload.get("text", "")))
        yield serialize_protocol_event(
            event=event_name,
            source="llm",
            trace_id=trace_id,
            payload=payload,
        )
