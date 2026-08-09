from __future__ import annotations

from dataclasses import dataclass

from json_types import JsonObject


@dataclass(frozen=True)
class ActionScore:
    total: int
    should_call_tool: bool
    called_tool: bool
    reasons: list[str]

    def to_dict(self) -> JsonObject:
        return {
            "total": self.total,
            "should_call_tool": self.should_call_tool,
            "called_tool": self.called_tool,
            "reasons": self.reasons,
        }
