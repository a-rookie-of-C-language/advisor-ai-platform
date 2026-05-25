from __future__ import annotations

from graph.planned_tools import (
    build_planned_tool_context,
    planned_tool_steps,
    should_use_direct_plan,
)


def test_planned_tool_steps_normalizes_call_tool_steps() -> None:
    steps = planned_tool_steps(
        {
            "steps": [
                {"action": "call_tool", "tool_name": "rag_search", "arguments": {"query": "q"}, "reason": "查资料"},
                {"action": "think", "tool_name": "ignored"},
                {"action": "call_tool", "tool_name": "", "arguments": {"query": "x"}},
                {"action": "call_tool", "tool_name": "web_search", "arguments": "bad"},
            ]
        }
    )

    assert steps == [
        {"tool_name": "rag_search", "arguments": {"query": "q"}, "reason": "查资料"},
        {"tool_name": "web_search", "arguments": {}, "reason": ""},
    ]


def test_should_use_direct_plan_checks_mode() -> None:
    assert should_use_direct_plan({"mode": "direct"}) is True
    assert should_use_direct_plan({"mode": "tools"}) is False
    assert should_use_direct_plan(None) is False


def test_build_planned_tool_context_contains_observations() -> None:
    message = build_planned_tool_context(
        [
            {
                "tool_name": "rag_search",
                "status": "hit",
                "message": "ok",
                "items": [{"snippet": "证据"}],
            }
        ]
    )

    assert message.role == "system"
    assert "按任务计划顺序执行工具" in message.content
    assert "rag_search" in message.content
    assert "证据" in message.content
