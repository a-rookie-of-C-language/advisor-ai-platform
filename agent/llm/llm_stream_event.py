from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class LLMStreamEvent:
    type: str
    text: str = ""
    tool_name: str = ""
    tool_args: dict[str, Any] | None = None
    tool_output: str = ""
    attempt: int = 0
    success: bool = True
