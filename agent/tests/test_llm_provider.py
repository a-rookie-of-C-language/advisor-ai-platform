from __future__ import annotations

import asyncio
from typing import Any, AsyncIterator, Iterable
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.tool_spec import ToolSpec


class TestBaseLLMProvider:
    def test_abstract_methods(self):
        """BaseLLMProvider cannot be instantiated directly."""
        with pytest.raises(TypeError):
            BaseLLMProvider()

    @pytest.mark.asyncio
    async def test_stream_chat_with_tools_default_implementation(self):
        class TestProvider(BaseLLMProvider):
            async def stream_chat(
                self,
                messages: Iterable[ChatMessage],
                *,
                response_format: dict[str, Any] | None = None,
            ) -> AsyncIterator[str]:
                yield "Hello"
                yield " World"

        provider = TestProvider()
        messages = [ChatMessage(role="user", content="test")]
        events = []
        async for event in provider.stream_chat_with_tools(messages, [], None):
            events.append(event)

        assert len(events) == 2
        assert events[0].type == "delta"
        assert events[0].text == "Hello"
        assert events[1].text == " World"


class TestChatMessage:
    def test_creation(self):
        msg = ChatMessage(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"

    def test_to_dict(self):
        msg = ChatMessage(role="assistant", content="Hi there")
        d = msg.to_dict()
        assert d == {"role": "assistant", "content": "Hi there"}


class TestLLMStreamEvent:
    def test_delta_event(self):
        event = LLMStreamEvent(type="delta", text="hello")
        assert event.type == "delta"
        assert event.text == "hello"

    def test_done_event(self):
        event = LLMStreamEvent(type="done")
        assert event.type == "done"
        assert event.text is None


class TestToolSpec:
    def test_creation(self):
        spec = ToolSpec(
            name="search",
            description="Search the web",
            parameters={"query": {"type": "string"}},
        )
        assert spec.name == "search"
        assert spec.description == "Search the web"

    def test_to_dict(self):
        spec = ToolSpec(
            name="search",
            description="Search",
            parameters={"query": {"type": "string"}},
        )
        d = spec.to_dict()
        assert d["function"]["name"] == "search"
