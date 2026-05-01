from __future__ import annotations

from typing import TypedDict

from llm.chat_message import ChatMessage


class GraphState(TypedDict, total=False):
    messages: list[ChatMessage]
    model_messages: list[ChatMessage]
    user_id: int | None
    session_id: int | None
    kb_id: int | None
    user_query: str
    trace_id: str | None
    turn_id: str | None
    memory_enabled: bool
    rag_enabled: bool
    use_tool: bool
    assistant_answer: str
    stream_failed: bool
    debug_delta_count: int
    debug_preview: str
