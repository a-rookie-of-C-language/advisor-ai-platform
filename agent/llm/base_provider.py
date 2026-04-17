from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, AsyncIterator, Awaitable, Callable, Iterable


@dataclass(frozen=True)
class ChatMessage:
    role: str
    content: str


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, Any]


@dataclass(frozen=True)
class LLMStreamEvent:
    type: str
    text: str = ""
    tool_name: str = ""
    tool_args: dict[str, Any] | None = None
    tool_output: str = ""
    attempt: int = 0
    success: bool = True


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
        # Default degrade path for providers without tool calling capability.
        _ = tools
        _ = tool_executor
        _ = max_tool_calls
        _ = max_tool_retries
        async for chunk in self.stream_chat(messages):
            yield LLMStreamEvent(type="delta", text=chunk)
