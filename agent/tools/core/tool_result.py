from __future__ import annotations

import json
from dataclasses import dataclass, field

from json_types import JsonObject, JsonValue, SupportsModelDump


@dataclass
class ToolResult:
    ok: bool
    status: str
    message: str
    items: list[JsonObject] = field(default_factory=list)
    meta: JsonObject = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.items = [self._normalize_item(item) for item in (self.items or [])]

    @staticmethod
    def _normalize_item(item: JsonValue | SupportsModelDump) -> JsonObject:
        if isinstance(item, dict):
            return item
        if hasattr(item, "model_dump"):
            try:
                dumped = item.model_dump()
                if isinstance(dumped, dict):
                    return dumped
            except Exception:
                pass
        if hasattr(item, "__dict__"):
            raw = {key: value for key, value in vars(item).items() if not key.startswith("_")}
            if raw:
                return raw
        return {"value": str(item)}

    @classmethod
    def denied(cls, message: str) -> "ToolResult":
        return cls(ok=False, status="denied", message=message, items=[])

    @classmethod
    def pending(cls, message: str, callback_id: str) -> "ToolResult":
        return cls(
            ok=False,
            status="pending",
            message=message,
            items=[],
            meta={"callback_id": callback_id},
        )

    @classmethod
    def error(cls, message: str) -> "ToolResult":
        return cls(ok=False, status="error", message=message, items=[])

    def to_dict(self) -> JsonObject:
        payload: JsonObject = {
            "ok": self.ok,
            "status": self.status,
            "message": self.message,
            "items": self.items,
        }
        if self.meta:
            payload["meta"] = self.meta
        return payload

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)
