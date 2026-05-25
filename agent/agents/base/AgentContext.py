from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass
class AgentContext:
    user_id: int | None = None
    session_id: int | None = None
    kb_id: int | None = None
    metadata: JsonObject = field(default_factory=dict)
