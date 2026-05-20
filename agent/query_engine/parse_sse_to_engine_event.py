from __future__ import annotations

import json
from typing import Any

from query_engine.EngineEvent import EngineEvent


def parse_sse_to_engine_event(raw: str) -> EngineEvent:
    event_name = "message"
    data: dict[str, Any] = {}
    for line in raw.strip().split("\n"):
        if line.startswith("event:"):
            event_name = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            payload = line.split(":", 1)[1].strip()
            try:
                parsed = json.loads(payload)
                if isinstance(parsed, dict):
                    data = parsed
            except json.JSONDecodeError:
                data = {}

    payload = data.get("payload") if isinstance(data.get("payload"), dict) else data
    source = str(data.get("source", "system"))
    trace_id = str(data.get("trace_id", "")) if data.get("trace_id") is not None else None
    event_version = str(data.get("event_version", "1.0"))

    return EngineEvent(
        event=event_name,
        source=source,
        payload=payload if isinstance(payload, dict) else {},
        trace_id=trace_id,
        event_version=event_version,
    )
