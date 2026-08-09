from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable
from typing import Any

from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer
from chat.legacy_force_fetch import execute_legacy_force_fetch
from chat.legacy_llm_delta_stream import stream_legacy_llm_data
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from prompt.PromptBuilder import PromptBuilder


async def stream_legacy_force_fetch_response(
    *,
    force_fetch_url: str,
    model_messages: list[ChatMessage],
    tool_executor: Callable[..., Any],
    provider: BaseLLMProvider,
    answer_buffer: ChatStreamAnswerBuffer,
    serialize_protocol_event: Callable[..., str],
    trace_id: str | None,
    debug_stream: bool,
    logger: logging.Logger,
) -> AsyncIterator[str]:
    force_fetch_events, context_prompt = await execute_legacy_force_fetch(
        url=force_fetch_url,
        tool_executor=tool_executor,
    )
    for force_fetch_event in force_fetch_events:
        yield serialize_protocol_event(
            event=str(force_fetch_event["event"]),
            source="tool",
            trace_id=trace_id,
            payload=force_fetch_event["payload"],
        )
    if context_prompt:
        model_messages = PromptBuilder.assemble_messages(
            model_messages,
            dynamic_prompts=[context_prompt],
        )
    async for delta_event in stream_legacy_llm_data(
        provider,
        model_messages,
        answer_buffer,
        serialize_protocol_event,
        trace_id,
    ):
        yield delta_event
    if debug_stream:
        logger.info(
            "debug_stream python done: deltas=%s, answer_preview=%s",
            answer_buffer.delta_count,
            answer_buffer.debug_preview,
        )
    yield serialize_protocol_event(
        event="sys_done",
        source="system",
        trace_id=trace_id,
        payload={"finish_reason": "stream_finished"},
    )
