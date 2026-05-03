from __future__ import annotations

import logging
import math
from datetime import datetime
from typing import List

from .base_strategy import BaseSourcePriorityStrategy
from .source_candidate import SourceCandidate

logger = logging.getLogger(__name__)


class TimeDecayStrategy(BaseSourcePriorityStrategy):
    """按 effective_date 衰减加分，越新分越高。

    适用场景：政策法规、时效性信息。
    衰减公式：score *= 1 + boost * exp(-lambda * years_ago)
    """

    name = "time_decay_v1"
    order = 200

    def __init__(
        self,
        half_life_years: float = 3.0,
        boost: float = 0.5,
    ) -> None:
        self._decay_lambda = math.log(2) / half_life_years
        self._boost = boost

    def rank(
        self,
        candidates: List[SourceCandidate],
        query: str,
        scene_hint: str,
    ) -> List[SourceCandidate]:
        now = datetime.now()
        for c in candidates:
            date_str = c.metadata.get("effective_date")
            if not date_str:
                continue
            try:
                dt = datetime.fromisoformat(date_str)
                years_ago = (now - dt).days / 365.25
                factor = 1.0 + self._boost * math.exp(-self._decay_lambda * max(years_ago, 0))
                c.score *= factor
            except (ValueError, TypeError):
                logger.debug("time_decay: 无法解析日期 %s, 跳过", date_str)
        return candidates
