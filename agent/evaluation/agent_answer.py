from __future__ import annotations

import json
from typing import Any

from llm.chat_message import ChatMessage


async def collect_agent_answer(service: Any, *, query: str, kb_id: int | None) -> str:
    messages = [ChatMessage(role="user", content=query)]
    answer_chunks: list[str] = []

    async for event in service.stream_events(
        messages=messages,
        user_id=0,
        session_id=0,
        kb_id=kb_id,
    ):
        delta = parse_sse_delta(event)
        if delta:
            answer_chunks.append(delta)

    return "".join(answer_chunks) if answer_chunks else "无回答"


def parse_sse_delta(event: str) -> str:
    if not event.startswith("data: "):
        return ""

    data_str = event[6:].strip()
    if not data_str:
        return ""

    try:
        data = json.loads(data_str)
    except json.JSONDecodeError:
        return ""

    if data.get("type") != "delta":
        return ""
    return data.get("content", "")
