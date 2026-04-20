from __future__ import annotations

from context.compaction.ContextCompactor import ContextCompactor
from llm.base_provider import ChatMessage


def test_context_compactor_keeps_system_and_tail_messages() -> None:
    compactor = ContextCompactor(
        enable_snip=True,
        enable_context_collapse=True,
        snip_keep_last=3,
        collapse_keep_last=2,
    )
    messages = [
        ChatMessage(role="system", content="sys"),
        ChatMessage(role="user", content="u1"),
        ChatMessage(role="assistant", content="a1"),
        ChatMessage(role="user", content="u2"),
        ChatMessage(role="assistant", content="a2"),
    ]
    compacted, stats = compactor.compact_for_model(messages)
    assert [m.content for m in compacted] == ["sys", "u2", "a2"]
    assert stats["tokens_before"] >= stats["tokens_after"]


def test_context_compactor_no_change_when_disabled() -> None:
    compactor = ContextCompactor(
        enable_snip=False,
        enable_context_collapse=False,
        snip_keep_last=3,
        collapse_keep_last=2,
    )
    messages = [
        ChatMessage(role="system", content="sys"),
        ChatMessage(role="user", content="u1"),
        ChatMessage(role="assistant", content="a1"),
    ]
    compacted, stats = compactor.compact_for_model(messages)
    assert [m.content for m in compacted] == ["sys", "u1", "a1"]
    assert stats["tokens_released"] == 0

