from __future__ import annotations

from pydantic import BaseModel, Field

from json_types import JsonObject


class MemoryCandidateInput(BaseModel):
    content: str = Field(min_length=1)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    source_turn_id: str | None = None
    tags: JsonObject = Field(default_factory=dict)
