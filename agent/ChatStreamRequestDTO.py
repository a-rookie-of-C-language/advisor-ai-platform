from __future__ import annotations

from pydantic import BaseModel, Field

from AttachmentDTO import AttachmentDTO
from ChatMessageDTO import ChatMessageDTO


class ChatStreamRequestDTO(BaseModel):
    messages: list[ChatMessageDTO] = Field(..., min_length=1)
    userId: int | None = None
    sessionId: int | None = None
    turnId: str | None = None
    traceId: str | None = None
    attachments: list[AttachmentDTO] | None = None
