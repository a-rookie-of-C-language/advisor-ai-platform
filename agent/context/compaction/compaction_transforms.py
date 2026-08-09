from __future__ import annotations

from llm.chat_message import ChatMessage


def estimate_tokens(messages: list[ChatMessage]) -> int:
    total = 0
    for message in messages:
        total += (len(message.content) // 4) + 1
    return total


def apply_keep_last(messages: list[ChatMessage], keep_last_non_system: int) -> list[ChatMessage]:
    system_messages = [message for message in messages if message.role == "system"]
    non_system = [message for message in messages if message.role != "system"]
    tail = non_system[-keep_last_non_system:]
    return system_messages + tail


def to_transcript_text(messages: list[ChatMessage]) -> str:
    lines: list[str] = []
    for message in messages:
        lines.append(f"{message.role}: {message.content}")
    return "\n".join(lines).strip()


def apply_autocompact(
    messages: list[ChatMessage],
    summary: str,
    keep_last_non_system: int,
) -> list[ChatMessage]:
    non_system = [message for message in messages if message.role != "system"]
    tail = non_system[-keep_last_non_system:]
    summary_message = ChatMessage(
        role="system",
        content="Context summary (autocompact):\n" + summary,
    )
    return [summary_message] + tail
