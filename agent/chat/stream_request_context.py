from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable

from chat.stream_compaction import ChatStreamCompactionSupport
from chat.stream_failure_memory import ChatStreamFailureMemorySupport
from chat.stream_message_utils import last_user_message, validate_messages
from json_types import JsonObject
from llm.chat_message import ChatMessage


@dataclass(frozen=True)
class ChatStreamRequestContext:
    validated_messages: list[ChatMessage]
    user_query: str
    compacted_messages: list[ChatMessage]
    compact_stats: JsonObject


async def prepare_stream_request_context(
    messages: Iterable[ChatMessage],
    *,
    session_id: int | None,
    failure_memory_enabled: bool,
    failure_memory_support: ChatStreamFailureMemorySupport,
    compaction_support: ChatStreamCompactionSupport,
) -> ChatStreamRequestContext:
    validated_messages = validate_messages(messages)
    user_query = last_user_message(validated_messages)
    if failure_memory_enabled and user_query:
        validated_messages = failure_memory_support.inject_avoidance_prompt(
            validated_messages,
            user_query=user_query,
        )

    compacted_messages, compact_stats = await compaction_support.compact(
        validated_messages,
        session_id=session_id,
    )
    return ChatStreamRequestContext(
        validated_messages=validated_messages,
        user_query=user_query,
        compacted_messages=compacted_messages,
        compact_stats=compact_stats,
    )


def log_stream_request_context(
    logger: logging.Logger,
    *,
    context: ChatStreamRequestContext,
    trace_id: str | None,
    turn_id: str | None,
    session_id: int | None,
    user_id: int | None,
    kb_id: int | None,
) -> None:
    logger.info(
        "stream_events start: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, kb_id=%s",
        trace_id,
        turn_id,
        session_id,
        user_id,
        kb_id,
    )
    compact_stats = context.compact_stats
    if compact_stats["tokens_released"] > 0:
        logger.info(
            "context_compaction_released session_id=%s released=%s before=%s after=%s",
            session_id,
            compact_stats["tokens_released"],
            compact_stats["tokens_before"],
            compact_stats["tokens_after"],
        )
    if compact_stats.get("auto_compacted"):
        logger.info(
            "context_autocompact_done session_id=%s transcript=%s",
            session_id,
            compact_stats.get("transcript_path", ""),
        )


def evaluate_trace_action_score(
    *,
    enabled: bool,
    failure_memory_support: ChatStreamFailureMemorySupport,
    user_query: str,
    trace_events: list[dict[str, object]],
    session_id: int | None,
    user_id: int | None,
) -> JsonObject:
    if not enabled:
        return {}
    return failure_memory_support.evaluate_trace_and_record(
        user_query=user_query,
        trace_events=trace_events,
        session_id=session_id,
        user_id=user_id,
    )
