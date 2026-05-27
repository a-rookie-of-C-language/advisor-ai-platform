from __future__ import annotations

import logging
from collections.abc import Callable

from fastapi import FastAPI, Request
from starlette.responses import StreamingResponse

from app_api_support import (
    STREAM_RESPONSE_HEADERS,
    build_chat_messages,
    build_stream_kwargs,
    require_agent_token,
)
from chat.stream_service import ChatStreamService
from ChatStreamRequestDTO import ChatStreamRequestDTO

logger = logging.getLogger(__name__)


def register_chat_routes(app: FastAPI, get_chat_stream_service: Callable[[], ChatStreamService]) -> None:
    @app.post("/chat/stream")
    async def chat_stream(request: ChatStreamRequestDTO, raw_request: Request) -> StreamingResponse:
        require_agent_token(raw_request)

        service = get_chat_stream_service()

        messages = build_chat_messages(request)
        trace_id = (
            raw_request.headers.get("X-Trace-Id")
            or request.traceId
            or ""
        )
        turn_id = (
            raw_request.headers.get("X-Turn-Id")
            or request.turnId
            or ""
        )
        logger.info(
            "agent_chat_stream accepted: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, messages=%s",
            trace_id,
            turn_id,
            request.sessionId,
            request.userId,
            len(messages),
        )

        stream_kwargs = build_stream_kwargs(
            service=service,
            request=request,
            trace_id=trace_id,
            turn_id=turn_id,
        )

        return StreamingResponse(
            service.stream_events(messages, **stream_kwargs),
            media_type="text/event-stream",
            headers=STREAM_RESPONSE_HEADERS,
        )
