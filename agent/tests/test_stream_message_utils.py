from dataclasses import dataclass

import pytest

from chat.stream_message_utils import (
    build_explorer_context,
    extract_first_url,
    last_user_message,
    looks_like_exploration_query,
    parse_serialized_event,
    prefer_rag_only,
    to_memory_messages,
    validate_messages,
)
from llm.chat_message import ChatMessage


def test_validate_messages_normalizes_roles_and_strips_surrogates():
    messages = validate_messages([
        ChatMessage(role=" USER ", content=" hello\ud800 "),
        ChatMessage(role="assistant", content="ok"),
    ])

    assert messages == [
        ChatMessage(role="user", content="hello"),
        ChatMessage(role="assistant", content="ok"),
    ]


def test_validate_messages_rejects_invalid_input():
    with pytest.raises(ValueError, match="Unsupported role"):
        validate_messages([ChatMessage(role="tool", content="hello")])
    with pytest.raises(ValueError, match="cannot be empty"):
        validate_messages([ChatMessage(role="user", content="   ")])


def test_message_helpers_extract_query_and_intent():
    messages = [
        ChatMessage(role="assistant", content="找到三名学生"),
        ChatMessage(role="user", content="他们都是谁"),
    ]

    assert last_user_message(messages) == "他们都是谁"
    assert to_memory_messages(messages)[0] == {"role": "assistant", "content": "找到三名学生"}
    assert looks_like_exploration_query("他们都是谁", messages) is True
    assert extract_first_url("看这个 https://example.com/a?b=1)") == "https://example.com/a?b=1"


def test_prefer_rag_only_respects_realtime_hints():
    assert prefer_rag_only("根据知识库回答学生资助政策") is True
    assert prefer_rag_only("根据知识库回答今天新闻") is False


def test_parse_serialized_event_unwraps_protocol_payload():
    parsed = parse_serialized_event(
        'event: sys_reasoning\n'
        'data: {"payload": {"message": "thinking"}, "source": "system"}\n\n'
    )

    assert parsed == {"event": "sys_reasoning", "data": {"message": "thinking"}}


@dataclass
class _Outcome:
    summary: str
    evidence: list[str]
    tool_calls: list[dict]


def test_build_explorer_context_contains_evidence_payload():
    context = build_explorer_context(
        _Outcome(summary="done", evidence=["a"], tool_calls=[{"name": "rag_search"}])
    )

    assert "read-only tool explorer" in context
    assert '"summary": "done"' in context
