from __future__ import annotations

from pydantic import BaseModel, Field


class ToolSearchInput(BaseModel):
    keywords: str = Field(..., min_length=1, description="空格分隔的搜索关键词")
    max_results: int = Field(default=3, ge=1, le=10)
