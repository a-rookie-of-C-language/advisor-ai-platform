from __future__ import annotations

from dataclasses import dataclass

from json_types import JsonObject


@dataclass(frozen=True)
class FailureMemoryItem:
    ts: str
    user_query: str
    session_id: int | None
    kb_id: int | None
    reasons: list[str]
    score: int
    avoid_strategy: str

    def to_dict(self) -> JsonObject:
        return {
            "ts": self.ts,
            "user_query": self.user_query,
            "session_id": self.session_id,
            "kb_id": self.kb_id,
            "reasons": list(self.reasons),
            "score": self.score,
            "avoid_strategy": self.avoid_strategy,
        }
