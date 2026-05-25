from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass
class ToolCallContext:
    tool_name: str
    args_text: str = ""
    tool_args: JsonObject = field(default_factory=dict)
    tool_output: str = ""
    attempt: int = 0
    last_error: str = ""
