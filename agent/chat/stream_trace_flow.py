from __future__ import annotations

from typing import AsyncIterator

from json_types import JsonObject

from .stream_message_utils import parse_serialized_event
from .stream_progress import wrap_stream_with_progress


async def stream_with_progress_trace(
    stream: AsyncIterator[str],
    *,
    trace_id: str | None,
    trace_events: list[JsonObject],
) -> AsyncIterator[str]:
    async for event in wrap_stream_with_progress(stream, trace_id=trace_id):
        trace_events.append(parse_serialized_event(event))
        yield event
