from __future__ import annotations

from typing import Dict, List

from memory.pipeline.rerank.base_strategy import BaseMemoryRerankStrategy


class MemoryRerankRegistry:
    def __init__(self) -> None:
        self._strategies: Dict[str, BaseMemoryRerankStrategy] = {}

    def register(self, strategy: BaseMemoryRerankStrategy) -> "MemoryRerankRegistry":
        self._strategies[strategy.name] = strategy
        return self

    def get(self, name: str) -> BaseMemoryRerankStrategy:
        strategy = self._strategies.get(name)
        if strategy is None:
            available = ", ".join(self.list_names()) or "(none)"
            raise ValueError(
                f"memory rerank strategy not found: {name!r}, available: {available}"
            )
        return strategy

    def list_names(self) -> List[str]:
        return list(self._strategies.keys())

    def has(self, name: str) -> bool:
        return name in self._strategies
