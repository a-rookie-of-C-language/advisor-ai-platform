from __future__ import annotations

from pydantic import BaseModel, Field


class RAGSearchInput(BaseModel):
    query: str | None = None
    top_k: int = Field(default=5, ge=1, le=10)
