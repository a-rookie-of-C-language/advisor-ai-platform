from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolResult:
    ok: bool
    status: str
    message: str
    items: list[dict[str, Any]] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)

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

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
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

