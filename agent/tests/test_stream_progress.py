from __future__ import annotations

import asyncio
import json

from chat.stream_progress import wrap_stream_with_progress
from chat.stream_protocol import serialize_event


def _event_name(raw: str) -> str:
    for line in raw.strip().split("\n"):
        if line.startswith("event:"):
            return line.split(":", 1)[1].strip()
    return "message"


def _payload(raw: str) -> dict:
    for line in raw.strip().split("\n"):
        if line.startswith("data:"):
            return json.loads(line.split(":", 1)[1].strip())
    return {}


async def _empty_stream():
    if False:
        yield ""


async def _done_without_delta_stream():
    yield serialize_event("done", {})


async def _delayed_delta_stream():
    await asyncio.sleep(1.05)
    yield serialize_event("llm_data", {"text": "hello"})


async def test_progress_wrapper_emits_error_for_empty_stream() -> None:
    events = [event async for event in wrap_stream_with_progress(_empty_stream(), trace_id="t1")]

    assert [_event_name(event) for event in events] == ["error"]
    assert _payload(events[0])["message"] == "stream finished without content"


async def test_progress_wrapper_rejects_done_without_content() -> None:
    events = [event async for event in wrap_stream_with_progress(_done_without_delta_stream(), trace_id="t1")]

    assert [_event_name(event) for event in events] == ["error"]
    assert _payload(events[0])["message"] == "stream finished without content"


async def test_progress_wrapper_emits_progress_before_first_delta() -> None:
    events = [event async for event in wrap_stream_with_progress(_delayed_delta_stream(), trace_id="trace-1")]

    assert [_event_name(event) for event in events] == ["sys_progress", "llm_data"]
    progress_payload = _payload(events[0])
    assert progress_payload["trace_id"] == "trace-1"
    assert progress_payload["payload"]["elapsed_sec"] == 1
