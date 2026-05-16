from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class EngineEvent:
    event: str
    source: str
    payload: dict[str, Any]
    trace_id: str | None = None
    event_version: str = "1.0"

    def to_sse(self) -> str:
        data = {
            "event_version": self.event_version,
            "trace_id": self.trace_id or "",
            "timestamp": int(time.time() * 1000),
            "source": self.source,
            "payload": self.payload,
        }
        return f"event: {self.event}\\ndata: {json.dumps(data, ensure_ascii=False)}\\n\\n"
