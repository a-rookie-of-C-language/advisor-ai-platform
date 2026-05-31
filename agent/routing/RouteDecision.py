from __future__ import annotations

from dataclasses import dataclass

from json_types import JsonObject

INTENT_ROUTE_EVENT = "intent_route"


@dataclass(frozen=True)
class RouteDecision:
    categories: set[str]
    matched_by: str
    confidence: float
    fallback_reason: str = ""
    scores: dict[str, int] | None = None
    reason: str = ""
    matched_tools: list[str] | None = None

    @property
    def event_name(self) -> str:
        return INTENT_ROUTE_EVENT

    def to_event_payload(self) -> JsonObject:
        categories = sorted(self.categories)
        return {
            "matched_by": self.matched_by,
            "confidence": self.confidence,
            "fallback_reason": self.fallback_reason,
            "categories": categories,
            "scores": self.scores or {},
            "reason": self.reason,
            "matched_tools": self.matched_tools or [],
            "source": {
                "decision": self.matched_by,
                "categories": categories,
                "matched_tools": self.matched_tools or [],
            },
        }
