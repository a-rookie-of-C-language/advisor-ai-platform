from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable

from chat.graph_stream_adapter import (
    graph_event_has_content,
    graph_event_payload,
    graph_event_source,
    graph_output_event_name,
    graph_text_payload,
    normalize_graph_event_name,
)
from chat.stream_defaults import STREAM_ERROR_MESSAGE
from chat.stream_message_utils import last_user_message, parse_serialized_event
from graph.runner import GraphRunner
from llm.chat_message import ChatMessage

logger = logging.getLogger(__name__)


async def stream_graph_events(
    *,
    graph_runner: GraphRunner,
    validated_messages: list[ChatMessage],
    user_id: int | None,
    session_id: int | None,
    kb_id: int | None,
    trace_id: str | None,
    turn_id: str | None,
    debug_stream: bool,
    serialize_protocol_event: Callable[..., str],
    emit_terminal_error: Callable[..., AsyncIterator[str]],
    legacy_fallback: Callable[[], AsyncIterator[str]],
) -> AsyncIterator[str]:
    user_query = last_user_message(validated_messages)
    yield serialize_protocol_event(
        event="sys_start",
        source="system",
        trace_id=trace_id,
        payload={"message": "stream_started"},
    )
    saw_content = False
    saw_error = False
    try:
        async for event in graph_runner.run_stream(
            messages=validated_messages,
            user_query=user_query,
            user_id=user_id,
            session_id=session_id,
            kb_id=kb_id,
            trace_id=trace_id,
            turn_id=turn_id,
        ):
            event_name = normalize_graph_event_name(str(event.get("event", "")))
            event_data = event.get("data", {})
            if event_name == "error":
                saw_error = True
            if graph_event_has_content(event_name):
                saw_content = True
            text = graph_text_payload(event_name, event_data)
            if text:
                saw_content = True
                yield serialize_protocol_event(
                    event=graph_output_event_name(
                        event_name,
                        user_id=user_id,
                        session_id=session_id,
                    ),
                    source="llm",
                    trace_id=trace_id,
                    payload={"text": text},
                )
                continue
            yield serialize_protocol_event(
                event=event_name,
                source=graph_event_source(event_name),
                trace_id=trace_id,
                payload=graph_event_payload(event_data),
            )
        if not saw_content and not saw_error:
            logger.warning(
                "Graph stream produced no content, fallback to legacy: user_id=%s, session_id=%s",
                user_id,
                session_id,
            )
            async for legacy_event in legacy_fallback():
                parsed = parse_serialized_event(legacy_event)
                if str(parsed.get("event", "")) == "sys_start":
                    continue
                yield legacy_event
            return
        yield serialize_protocol_event(
            event="sys_done",
            source="system",
            trace_id=trace_id,
            payload={"finish_reason": "stream_finished"},
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "Graph stream failed: user_id=%s, session_id=%s",
            user_id,
            session_id,
        )
        if debug_stream:
            logger.warning("debug_stream python error(graph): error=%s", exc)
        try:
            async for terminal_event in emit_terminal_error(
                trace_id=trace_id,
                code="internal_error",
                message=STREAM_ERROR_MESSAGE,
                retryable=True,
            ):
                yield terminal_event
        except Exception as send_error_exc:  # noqa: BLE001
            logger.warning("Failed to send stream error event: %s", send_error_exc)
