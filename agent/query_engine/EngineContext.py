from __future__ import annotations

from dataclasses import dataclass

from llm.chat_message import ChatMessage


@dataclass(frozen=True)
class EngineContext:
    messages: list[ChatMessage]
    user_id: int | None = None
    session_id: int | None = None
    kb_id: int | None = None
    trace_id: str | None = None
    turn_id: str | None = None
