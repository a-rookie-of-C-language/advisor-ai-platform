from __future__ import annotations

from pydantic import BaseModel, Field

from tools.memory_write.MemoryCandidateInput import MemoryCandidateInput


class MemoryWriteInput(BaseModel):
    candidates: list[MemoryCandidateInput] = Field(min_length=1)
