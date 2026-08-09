from __future__ import annotations

from pydantic import BaseModel, Field

from AttachmentDTO import AttachmentDTO


class ChatMessageDTO(BaseModel):
    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    attachments: list[AttachmentDTO] | None = None
