from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Awaitable, Callable, Iterable

from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.tool_spec import ToolSpec

ToolExecutor = Callable[[str, dict[str, Any]], Awaitable[str]]


class BaseLLMProvider(ABC):
    @abstractmethod
    async def stream_chat(self, messages: Iterable[ChatMessage]) -> AsyncIterator[str]:
        """Stream response chunks for a chat request."""
        raise NotImplementedError

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor: ToolExecutor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = tools
        _ = tool_executor
        _ = max_tool_calls
        _ = max_tool_retries
        async for chunk in self.stream_chat(messages):
            yield LLMStreamEvent(type="delta", text=chunk)
