from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Iterable

from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage


async def stream_plain_chat_protocol_events(
    *,
    provider: BaseLLMProvider,
    model_messages: Iterable[ChatMessage],
) -> AsyncIterator[JsonObject]:
    reasoning_queue: asyncio.Queue[str] = asyncio.Queue()

    async def emit_reasoning(text: str) -> None:
        await reasoning_queue.put(text)

    async for delta in provider.stream_chat(
        model_messages,
        on_reasoning=emit_reasoning,
    ):
        async for reasoning_event in _drain_reasoning_events(reasoning_queue):
            yield reasoning_event
        yield {"event": "llm_data", "payload": {"text": delta}}

    async for reasoning_event in _drain_reasoning_events(reasoning_queue):
        yield reasoning_event


async def _drain_reasoning_events(reasoning_queue: asyncio.Queue[str]) -> AsyncIterator[JsonObject]:
    while True:
        try:
            reasoning_text = reasoning_queue.get_nowait()
        except asyncio.QueueEmpty:
            break
        yield {"event": "reasoning_delta", "payload": {"text": reasoning_text}}
