from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, Iterable


@dataclass(frozen=True)
class ChatMessage:
    role: str
    content: str


class BaseLLMProvider(ABC):
    @abstractmethod
    async def stream_chat(self, messages: Iterable[ChatMessage]) -> AsyncIterator[str]:
        """Stream response chunks for a chat request."""
        raise NotImplementedError
