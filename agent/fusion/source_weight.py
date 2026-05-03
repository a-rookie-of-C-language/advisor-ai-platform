from __future__ import annotations

from typing import Dict, List

from .base_strategy import BaseSourcePriorityStrategy
from .source_candidate import SourceCandidate


class SourceWeightStrategy(BaseSourcePriorityStrategy):
    """按来源类型加权：RAG > Web > 用户上下文。

    适用场景：通用兜底策略。
    """

    name = "source_weight_v1"
    order = 300

    def __init__(self, weights: Dict[str, float] | None = None) -> None:
        self._weights = weights or {
            "rag": 1.0,
            "web": 0.7,
            "user_context": 0.5,
        }

    def rank(
        self,
        candidates: List[SourceCandidate],
        query: str,
        scene_hint: str,
    ) -> List[SourceCandidate]:
        for c in candidates:
            weight = self._weights.get(c.source, 0.6)
            c.score *= weight
        return candidates
