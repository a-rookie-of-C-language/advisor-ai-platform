from __future__ import annotations

import inspect
import logging
import os
import secrets
from typing import Any

from fastapi import HTTPException, Request

from ChatStreamRequestDTO import ChatStreamRequestDTO
from llm.chat_message import ChatMessage

logger = logging.getLogger(__name__)

STREAM_RESPONSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def resolve_agent_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return request.headers.get("X-Agent-Token", "").strip()


def require_agent_token(raw_request: Request) -> None:
    expected_agent_token = os.getenv("AGENT_API_TOKEN", "").strip()
    if not expected_agent_token:
        return
    got_token = resolve_agent_token(raw_request)
    if not secrets.compare_digest(got_token, expected_agent_token):
        raise HTTPException(status_code=401, detail="invalid agent token")


def build_chat_messages(request: ChatStreamRequestDTO) -> list[ChatMessage]:
    messages = []
    for item in request.messages:
        messages.append(
            ChatMessage(
                role=item.role,
                content=item.content,
                attachments=convert_attachments(item.attachments),
            )
        )
    return messages


def build_stream_kwargs(
    *,
    service: Any,
    request: ChatStreamRequestDTO,
    trace_id: str,
    turn_id: str,
) -> dict[str, Any]:
    stream_kwargs: dict[str, Any] = {
        "user_id": request.userId,
        "session_id": request.sessionId,
    }
    try:
        parameters = inspect.signature(service.stream_events).parameters
        if "trace_id" in parameters:
            stream_kwargs["trace_id"] = trace_id or None
        if "turn_id" in parameters:
            stream_kwargs["turn_id"] = turn_id or None
    except (TypeError, ValueError) as exc:
        logger.debug("skip stream_events signature inspection: %s", exc)
    return stream_kwargs


def convert_attachments(atts) -> list[dict[str, Any]] | None:
    if not atts:
        return None
    return [
        {
            "id": attachment.id,
            "file_name": attachment.fileName,
            "file_type": attachment.fileType,
            "file_path": attachment.filePath,
        }
        for attachment in atts
    ]
