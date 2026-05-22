from __future__ import annotations

import json
from typing import AsyncIterator, Iterable

import pytest

from agents.tool_explorer import ToolExplorerSubAgent
from json_types import JsonValue
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec


class _ProviderJsonSequence:
    def __init__(self, payloads: list[dict]) -> None:
        self._payloads = payloads

    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        _ = messages
        _ = kwargs
        payload = self._payloads.pop(0)
        yield json.dumps(payload, ensure_ascii=False)


@pytest.mark.asyncio
async def test_tool_explorer_calls_read_only_tool_and_summarizes() -> None:
    provider = _ProviderJsonSequence(
        [
            {
                "action": "call_tool",
                "tool_name": "mcp__student__list_students",
                "arguments": {},
                "reason": "用户追问上一轮学生名单",
                "sufficient": False,
            },
            {
                "action": "final",
                "sufficient": True,
                "summary": "已获得学生名单",
            },
        ]
    )
    subagent = ToolExplorerSubAgent(provider, max_steps=2)
    tool = ToolSpec(
        name="mcp__student__list_students",
        description="List students",
        parameters={"type": "object", "properties": {}},
        is_read_only=True,
    )
    calls: list[tuple[str, dict]] = []

    async def executor(tool_name: str, tool_args: dict) -> str:
        calls.append((tool_name, tool_args))
        return json.dumps(
            {
                "ok": True,
                "status": "success",
                "message": "共 2 条记录",
                "items": [{"type": "text", "text": "张三、李四"}],
            },
            ensure_ascii=False,
        )

    outcome = await subagent.explore(
        user_query="need list",
        recent_messages=[
            ChatMessage(role="user", content="how many students?"),
            ChatMessage(role="assistant", content="There are 20 students."),
            ChatMessage(role="user", content="need list"),
        ],
        available_tools=[tool],
        candidate_tools=[],
        initial_route={"matched_by": "fallback", "matched_tools": []},
        tool_executor=executor,
    )

    assert outcome.used is True
    assert outcome.sufficient is True
    assert calls == [("mcp__student__list_students", {})]
    assert [event.event for event in outcome.events] == ["sys_tool_plan", "tool_use", "tool_result"]
