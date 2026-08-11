from __future__ import annotations

from pydantic import BaseModel, Field


class WebFetchInput(BaseModel):
    url: str = Field(description="URL to fetch content from")
    max_content_length: int = Field(default=2000, ge=100, le=5000, description="Maximum characters to return")
