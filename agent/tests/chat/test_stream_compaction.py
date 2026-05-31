from __future__ import annotations

from chat.stream_compaction import ChatStreamCompactionSupport
from chat.stream_runtime_config import ChatStreamRuntimeConfig
from llm.chat_message import ChatMessage


class _FakeCompactionSubAgent:
    def __init__(self, summary: str = "summary") -> None:
        self.summary = summary
        self.transcripts: list[str] = []

    async def summarize_transcript(self, transcript: str) -> str:
        self.transcripts.append(transcript)
        return self.summary


def _config(tmp_path, *, auto_enabled: bool = False) -> ChatStreamRuntimeConfig:
    return ChatStreamRuntimeConfig(
        debug_stream=False,
        enable_tool_use=True,
        use_langgraph=True,
        enabled_tools=None,
        feature_action_scoring=True,
        feature_failure_memory_inject=True,
        action_score_threshold=70,
        tool_explorer_max_steps=2,
        failure_memory_dir=str(tmp_path / "failure_memory"),
        context_snip_enabled=False,
        context_collapse_enabled=False,
        context_micro_enabled=False,
        context_auto_enabled=auto_enabled,
        context_snip_keep_last=12,
        context_collapse_keep_last=8,
        context_micro_replace_before_rounds=3,
        context_auto_trigger_tokens=1,
        context_auto_keep_last=1,
        context_transcript_dir=str(tmp_path / "transcripts"),
    )


async def test_compaction_support_keeps_messages_when_disabled(tmp_path) -> None:
    support = ChatStreamCompactionSupport(
        config=_config(tmp_path),
        subagent=_FakeCompactionSubAgent(),
    )
    messages = [ChatMessage(role="user", content="hello")]

    compacted, stats = await support.compact(messages, session_id=1)

    assert compacted == messages
    assert stats["auto_enabled"] is False
    assert stats["latency_ms"] >= 0
    assert support.last_stats is stats


async def test_compaction_support_autocompacts_and_persists_transcript(tmp_path) -> None:
    subagent = _FakeCompactionSubAgent(summary="short summary")
    support = ChatStreamCompactionSupport(
        config=_config(tmp_path, auto_enabled=True),
        subagent=subagent,
    )
    messages = [
        ChatMessage(role="user", content="old question with enough text"),
        ChatMessage(role="assistant", content="old answer with enough text"),
        ChatMessage(role="user", content="latest question"),
    ]

    compacted, stats = await support.compact(messages, session_id=3)

    assert stats["auto_compacted"] is True
    assert stats["transcript_path"]
    assert subagent.transcripts
    assert compacted[0].role == "system"
    assert "short summary" in compacted[0].content
    assert compacted[-1].content == "latest question"
