from __future__ import annotations

from typing import AsyncIterator, Callable

from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer
from chat.legacy_tool_event_adapter import (
    build_legacy_tool_protocol_event,
)
from json_types import JsonObject


async def stream_legacy_tool_chat_events(
    events: AsyncIterator,
    answer_buffer: ChatStreamAnswerBuffer,
    serialize_protocol_event: Callable[..., str],
    trace_id: str | None,
) -> AsyncIterator[str]:
    async for event in events:
        tool_protocol_event = build_legacy_tool_protocol_event(event)
        if tool_protocol_event is not None:
            yield serialize_protocol_event(
                event=str(tool_protocol_event["event"]),
                source="tool",
                trace_id=trace_id,
                payload=tool_protocol_event["payload"],
            )
            continue

        if event.type != "delta" or not event.text:
            continue
        delta = event.text
        answer_buffer.append(delta)
        payload: JsonObject = {"text": delta}
        yield serialize_protocol_event(
            event="llm_data",
            source="llm",
            trace_id=trace_id,
            payload=payload,
        )
