from __future__ import annotations

from dataclasses import dataclass

from json_types import JsonObject


@dataclass(frozen=True)
class LLMStreamEvent:
    type: str
    text: str = ""
    tool_name: str = ""
    tool_args: JsonObject | None = None
    tool_output: str = ""
    attempt: int = 0
    success: bool = True
