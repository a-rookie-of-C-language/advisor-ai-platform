from __future__ import annotations

from context.compaction.ContextCompactor import ContextCompactor
from llm.base_provider import ChatMessage


import pytest


@pytest.mark.asyncio
async def test_context_compactor_keeps_system_and_tail_messages() -> None:
    compactor = ContextCompactor(
        enable_snip=True,
        enable_microcompact=True,
        enable_context_collapse=True,
        enable_autocompact=False,
        snip_keep_last=3,
        micro_replace_before_rounds=3,
        collapse_keep_last=2,
        auto_trigger_tokens=70000,
        auto_keep_last=4,
    )
    messages = [
        ChatMessage(role="system", content="sys"),
        ChatMessage(role="assistant", content='{"tool":"rag_search","status":"hit","items":[]}'),
        ChatMessage(role="assistant", content="a1"),
        ChatMessage(role="user", content="u2"),
        ChatMessage(role="assistant", content="a2"),
    ]
    compacted, stats = await compactor.compact_for_model(messages, session_id=1)
    assert [m.content for m in compacted] == ["sys", "u2", "a2"]
    assert stats["tokens_before"] >= stats["tokens_after"]


@pytest.mark.asyncio
async def test_context_compactor_no_change_when_disabled() -> None:
    compactor = ContextCompactor(
        enable_snip=False,
        enable_microcompact=False,
        enable_context_collapse=False,
        enable_autocompact=False,
        snip_keep_last=3,
        micro_replace_before_rounds=3,
        collapse_keep_last=2,
        auto_trigger_tokens=70000,
        auto_keep_last=4,
    )
    messages = [
        ChatMessage(role="system", content="sys"),
        ChatMessage(role="user", content="u1"),
        ChatMessage(role="assistant", content="a1"),
    ]
    compacted, stats = await compactor.compact_for_model(messages, session_id=None)
    assert [m.content for m in compacted] == ["sys", "u1", "a1"]
    assert stats["tokens_released"] == 0


@pytest.mark.asyncio
async def test_context_compactor_autocompact_triggered() -> None:
    compactor = ContextCompactor(
        enable_snip=False,
        enable_microcompact=False,
        enable_context_collapse=False,
        enable_autocompact=True,
        snip_keep_last=3,
        micro_replace_before_rounds=3,
        collapse_keep_last=2,
        auto_trigger_tokens=5,
        auto_keep_last=2,
    )
    messages = [
        ChatMessage(role="system", content="sys"),
        ChatMessage(role="user", content="u1 message"),
        ChatMessage(role="assistant", content="a1 response"),
        ChatMessage(role="user", content="u2 message"),
    ]

    async def _summarize(_: str) -> str:
        return "summary"

    compacted, stats = await compactor.compact_for_model(
        messages,
        session_id=1,
        summarize_fn=_summarize,
        persist_transcript_fn=lambda s, m: f"path-{s}-{len(m)}",
    )
    assert compacted[0].role == "system"
    assert "summary" in compacted[0].content
    assert stats["auto_compacted"] is True
    assert str(stats["transcript_path"]).startswith("path-1-")
