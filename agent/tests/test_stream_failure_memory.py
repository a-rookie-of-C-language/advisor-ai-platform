from __future__ import annotations

from chat.stream_failure_memory import ChatStreamFailureMemorySupport
from llm.chat_message import ChatMessage
from memory.failure_memory_store import FailureMemoryStore
from memory.FailureMemoryItem import FailureMemoryItem


def test_inject_avoidance_prompt_for_similar_failure(tmp_path) -> None:
    store = FailureMemoryStore(str(tmp_path))
    store.append(
        FailureMemoryItem(
            ts="1",
            user_query="根据知识库回答辅导员职责",
            session_id=1,
            kb_id=None,
            reasons=["should_call_but_not_called"],
            score=60,
            avoid_strategy="先调用检索工具",
        )
    )
    support = ChatStreamFailureMemorySupport(store=store, action_score_threshold=70)

    messages = [ChatMessage(role="user", content="请根据知识库回答辅导员职责")]
    injected = support.inject_avoidance_prompt(messages, user_query=messages[0].content)

    assert injected[0].role == "system"
    assert "历史失败模式" in injected[0].content
    assert "先调用检索工具" in injected[0].content
    assert injected[1:] == messages


def test_evaluate_trace_records_low_score_failure(tmp_path) -> None:
    store = FailureMemoryStore(str(tmp_path))
    support = ChatStreamFailureMemorySupport(store=store, action_score_threshold=90)

    score = support.evaluate_trace_and_record(
        user_query="请根据知识库回答政策依据",
        trace_events=[],
        session_id=7,
        user_id=8,
    )

    loaded = store.load_recent(limit=10)
    assert score["total"] == 70
    assert loaded
    assert loaded[0]["session_id"] == 7
    assert loaded[0]["reasons"] == ["should_call_but_not_called"]
