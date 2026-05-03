from __future__ import annotations

from memory.failure_memory_matcher import FailureMemoryMatcher
from memory.failure_memory_store import FailureMemoryItem, FailureMemoryStore


def test_failure_memory_store_and_load(tmp_path) -> None:
    store = FailureMemoryStore(str(tmp_path))
    item = FailureMemoryItem(
        ts="1",
        user_query="根据知识库回答",
        session_id=1,
        kb_id=1,
        reasons=["should_call_but_not_called"],
        score=60,
        avoid_strategy="先调用检索工具",
    )
    store.append(item)
    loaded = store.load_recent(limit=10)
    assert loaded
    assert loaded[0]["score"] == 60


def test_failure_memory_matcher_hits_similar_query() -> None:
    hit = FailureMemoryMatcher.match(
        "请根据知识库回答",
        [{"user_query": "根据知识库回答", "avoid_strategy": "先调用检索工具"}],
    )
    assert hit is not None
    assert hit["similarity"] >= 0.35
