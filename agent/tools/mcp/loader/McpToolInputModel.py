from __future__ import annotations

from pydantic import BaseModel


class McpToolInputModel(BaseModel):
    class Config:
        extra = "allow"
