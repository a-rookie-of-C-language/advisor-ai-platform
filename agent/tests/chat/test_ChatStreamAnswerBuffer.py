from __future__ import annotations

from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer


def test_answer_buffer_collects_answer_without_debug_preview():
    buffer = ChatStreamAnswerBuffer(debug_enabled=False)

    buffer.append("hello")
    buffer.append(" world")

    assert buffer.answer == "hello world"
    assert buffer.delta_count == 0
    assert buffer.debug_preview == ""


def test_answer_buffer_tracks_debug_preview_with_limit():
    buffer = ChatStreamAnswerBuffer(debug_enabled=True, preview_limit=5)

    buffer.append("hello")
    buffer.append(" world")

    assert buffer.answer == "hello world"
    assert buffer.delta_count == 2
    assert buffer.debug_preview == "hello"
