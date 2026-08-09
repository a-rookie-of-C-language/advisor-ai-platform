from __future__ import annotations

from fusion.source_candidate import SourceCandidate
from graph.fusion_context_flow import inject_fusion_context
from graph.helpers import _prefer_rag_only, _strip_surrogates
from llm.chat_message import ChatMessage


def test_prefer_rag_only_uses_shared_realtime_hints() -> None:
    assert _prefer_rag_only("根据知识库回答学生资助政策") is True
    assert _prefer_rag_only("根据知识库回答最新学生政策") is False
    assert _prefer_rag_only("根据知识库回答现在的天气") is False


def test_strip_surrogates_removes_invalid_code_units() -> None:
    assert _strip_surrogates("ok\ud800text") == "oktext"


def test_inject_fusion_context_uses_shared_chinese_prompt() -> None:
    messages = [ChatMessage(role="user", content="问题")]
    injected = inject_fusion_context(
        messages,
        {
            "candidates": [
                SourceCandidate(
                    content="知识库证据",
                    source="rag",
                    metadata={"authority": "official", "_conflict_hint": "冲突提示"},
                ),
                SourceCandidate(
                    content="网页证据",
                    source="web",
                    metadata={"title": "网页"},
                ),
            ],
            "conflict_hint": "冲突提示",
        },
    )

    assert injected[0].role == "system"
    assert "以下是多源检索结果" in injected[0].content
    assert "【知识库检索结果】" in injected[0].content
    assert "【网络搜索结果】" in injected[0].content
    assert "冲突提示" in injected[0].content
    assert injected[1:] == messages
