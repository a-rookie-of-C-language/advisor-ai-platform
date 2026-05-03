from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List

from .source_candidate import SourceCandidate


class BaseSourcePriorityStrategy(ABC):
    """跨源优先级排序策略基类。"""

    order: int = 100
    enabled: bool = True

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    def is_enabled(self) -> bool:
        return bool(self.enabled)

    @abstractmethod
    def rank(
        self,
        candidates: List[SourceCandidate],
        query: str,
        scene_hint: str,
    ) -> List[SourceCandidate]:
        raise NotImplementedError
