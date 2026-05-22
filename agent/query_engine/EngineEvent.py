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

    @classmethod
    def llm_delta(cls, text: str, *, trace_id: str | None = None) -> "EngineEvent":
        return cls(event="llm_data", source="llm", payload={"text": text}, trace_id=trace_id)

    @classmethod
    def tool_use(
        cls,
        *,
        tool_name: str,
        tool_call_id: str,
        input_payload: dict[str, Any],
        trace_id: str | None = None,
    ) -> "EngineEvent":
        return cls(
            event="tool_use",
            source="tool",
            payload={"tool_name": tool_name, "tool_call_id": tool_call_id, "input": input_payload},
            trace_id=trace_id,
        )

    @classmethod
    def tool_result(cls, payload: dict[str, Any], *, trace_id: str | None = None) -> "EngineEvent":
        return cls(event="tool_result", source="tool", payload=payload, trace_id=trace_id)

    @classmethod
    def tool_error(cls, payload: dict[str, Any], *, trace_id: str | None = None) -> "EngineEvent":
        return cls(event="tool_error", source="tool", payload=payload, trace_id=trace_id)

    @classmethod
    def sys_done(cls, finish_reason: str, *, trace_id: str | None = None) -> "EngineEvent":
        return cls(event="sys_done", source="system", payload={"finish_reason": finish_reason}, trace_id=trace_id)

    @classmethod
    def sys_error(
        cls,
        *,
        code: str,
        message: str,
        retryable: bool,
        trace_id: str | None = None,
    ) -> "EngineEvent":
        return cls(
            event="sys_error",
            source="system",
            payload={"code": code, "message": message, "retryable": retryable},
            trace_id=trace_id,
        )

    def to_sse(self) -> str:
        data = {
            "event_version": self.event_version,
            "trace_id": self.trace_id or "",
            "timestamp": int(time.time() * 1000),
            "source": self.source,
            "payload": self.payload,
        }
        return f"event: {self.event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
