from __future__ import annotations

import asyncio
from typing import AsyncIterator

from chat.stream_message_utils import parse_serialized_event
from chat.stream_protocol import serialize_event, serialize_protocol_event

_PROGRESS_MESSAGE = "思考模式中考量中，请稍候..."
_EMPTY_STREAM_MESSAGE = "stream finished without content"


async def wrap_stream_with_progress(
    event_stream: AsyncIterator[str],
    *,
    trace_id: str | None,
) -> AsyncIterator[str]:
    iterator = event_stream.__aiter__()
    progress_seconds = 0
    saw_delta = False
    saw_done = False
    saw_error = False
    pending_next: asyncio.Task[str] | None = None
    while True:
        if pending_next is None:
            pending_next = asyncio.create_task(iterator.__anext__())
        try:
            event = await asyncio.wait_for(asyncio.shield(pending_next), timeout=1.0)
            pending_next = None
        except TimeoutError:
            if not saw_delta:
                progress_seconds += 1
                yield serialize_protocol_event(
                    event="sys_progress",
                    source="system",
                    trace_id=trace_id,
                    payload={"message": _PROGRESS_MESSAGE, "elapsed_sec": progress_seconds},
                )
            continue
        except StopAsyncIteration:
            if not saw_delta and not saw_done and not saw_error:
                yield serialize_event(
                    "error",
                    {"message": _EMPTY_STREAM_MESSAGE},
                )
            return
        except Exception:
            pending_next = None
            raise

        parsed = parse_serialized_event(event)
        event_name = str(parsed.get("event", ""))
        if event_name in {"llm_data", "llm_delta", "raw", "delta"}:
            saw_delta = True
        if event_name == "error":
            saw_error = True
        if event_name == "done":
            saw_done = True
        if event_name == "done" and not saw_delta and not saw_error:
            yield serialize_event(
                "error",
                {"message": _EMPTY_STREAM_MESSAGE},
            )
            return
        yield event
