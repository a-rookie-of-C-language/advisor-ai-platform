from __future__ import annotations

from pydantic import BaseModel


class AttachmentDTO(BaseModel):
    id: int
    fileName: str | None = None
    fileType: str | None = None
    filePath: str | None = None
