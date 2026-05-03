from __future__ import annotations

from typing import List

from .base_strategy import BaseSourcePriorityStrategy
from .source_candidate import SourceCandidate


class AuthorityBoostStrategy(BaseSourcePriorityStrategy):
    """权威性加分策略，official 来源优先。

    适用场景：产品文档、官方制度等权威性优先的查询。
    """

    name = "authority_boost_v1"
    order = 100

    def __init__(self, boost: float = 0.5) -> None:
        self._boost = boost

    def rank(
        self,
        candidates: List[SourceCandidate],
        query: str,
        scene_hint: str,
    ) -> List[SourceCandidate]:
        for c in candidates:
            if c.metadata.get("authority") == "official":
                c.score *= 1.0 + self._boost
        return candidates
