from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Dict, List, Set

from context.memory.core.governance import MemoryGovernance
from context.memory.core.MemoryItem import MemoryItem
from context.memory.pipeline.rerank.base_strategy import BaseMemoryRerankStrategy

# 预编译正则，避免每次调用都重新编译
_RE_TOKEN = re.compile(r"[a-z0-9_]+|[一-鿿]+")


class ConfidenceDecayRerank(BaseMemoryRerankStrategy):
    DEFAULT_WEIGHTS: Dict[str, float] = {
        "score": 0.40,
        "confidence": 0.25,
        "decay": 0.20,
        "lexical": 0.15,
    }

    def __init__(
        self,
        weights: Dict[str, float] | None = None,
        governance: MemoryGovernance | None = None,
    ) -> None:
        self._weights = {**self.DEFAULT_WEIGHTS, **(weights or {})}
        self._governance = governance or MemoryGovernance()

    @property
    def name(self) -> str:
        return "confidence_decay_v1"

    def rank(
        self,
        items: List[MemoryItem],
        query: str,
        top_k: int,
    ) -> List[MemoryItem]:
        if top_k <= 0 or not items:
            return []

        now = datetime.now(timezone.utc)
        query_tokens = self._tokenize(query)

        # 🚀 优化：循环外预切所有 items 的词，避免在 sorted() 的 key 函数中重复切词
        content_tokens_cache: Dict[str, Set[str]] = {}
        for item in items:
            content_tokens_cache[item.id] = self._tokenize(item.content)

        def score(item: MemoryItem) -> float:
            content_tokens = content_tokens_cache[item.id]
            overlap = len(query_tokens & content_tokens)
            lexical = overlap / max(len(query_tokens), 1)
            decay = self._governance.compute_time_decay(item, now=now)
            return (
                self._weights.get("score", 0.40) * item.score
                + self._weights.get("confidence", 0.25) * item.confidence
                + self._weights.get("decay", 0.20) * decay
                + self._weights.get("lexical", 0.15) * lexical
            )

        return sorted(items, key=score, reverse=True)[:top_k]

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        lowered = text.lower()
        return set(_RE_TOKEN.findall(lowered))
