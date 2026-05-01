from __future__ import annotations

from eval.action_score import score_action


def test_score_action_penalizes_missing_tool_call() -> None:
    score = score_action(
        user_query="请根据知识库给出来源",
        kb_id=1,
        trace_events=[{"event": "start", "data": {}}, {"event": "delta", "data": {"text": "x"}}, {"event": "done", "data": {}}],
    )
    assert score.should_call_tool is True
    assert score.called_tool is False
    assert score.total <= 70


def test_score_action_full_score_when_tool_hit_and_success() -> None:
    score = score_action(
        user_query="请根据知识库给出来源",
        kb_id=1,
        trace_events=[
            {"event": "start", "data": {}},
            {"event": "sources", "data": {"tool": "rag_search", "status": "hit", "items": []}},
            {"event": "delta", "data": {"text": "x"}},
            {"event": "done", "data": {}},
        ],
    )
    assert score.called_tool is True
    assert score.total == 100
