from __future__ import annotations

from typing import Dict, List

from .base_strategy import BaseSourcePriorityStrategy


class SourcePriorityRegistry:
    """跨源优先级策略注册中心。"""

    def __init__(self) -> None:
        self._strategies: Dict[str, BaseSourcePriorityStrategy] = {}

    def register(self, strategy: BaseSourcePriorityStrategy) -> "SourcePriorityRegistry":
        self._strategies[strategy.name] = strategy
        return self

    def get(self, name: str) -> BaseSourcePriorityStrategy:
        strategy = self._strategies.get(name)
        if strategy is None:
            raise ValueError(f"source priority strategy not found: {name}")
        return strategy

    def get_enabled_ordered(self) -> List[BaseSourcePriorityStrategy]:
        enabled = [s for s in self._strategies.values() if s.is_enabled()]
        return sorted(enabled, key=lambda s: (s.order, s.name))
