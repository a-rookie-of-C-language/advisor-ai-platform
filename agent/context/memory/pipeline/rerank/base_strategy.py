from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List

from context.memory.core.schema import MemoryItem


class BaseMemoryRerankStrategy(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def rank(
        self,
        items: List[MemoryItem],
        query: str,
        top_k: int,
    ) -> List[MemoryItem]:
        raise NotImplementedError
