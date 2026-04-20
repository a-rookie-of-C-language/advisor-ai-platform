from __future__ import annotations

import re
from typing import List

from context.memory.core.schema import MemoryItem
from context.memory.pipeline.rerank.base_strategy import BaseMemoryRerankStrategy


class DiversityRerank(BaseMemoryRerankStrategy):
    DEFAULT_LAMBDA = 0.7

    def __init__(self, lambda_param: float = DEFAULT_LAMBDA) -> None:
        self._lambda = max(0.0, min(1.0, lambda_param))

    @property
    def name(self) -> str:
        return "diversity_mmr_v1"

    def rank(
        self,
        items: List[MemoryItem],
        query: str,
        top_k: int,
    ) -> List[MemoryItem]:
        if top_k <= 0 or not items:
            return []

        selected: list[MemoryItem] = []
        remaining = list(items)
        query_vec = self._tokenize_to_set(query)

        while len(selected) < top_k and remaining:
            best_item = None
            best_score = -1.0

            for candidate in remaining:
                relevance = self._similarity(candidate.content, query_vec)
                if not selected:
                    score = relevance
                else:
                    max_sim = max(
                        self._similarity(candidate.content, sel.content)
                        for sel in selected
                    )
                    mmr_score = self._lambda * relevance - (1 - self._lambda) * max_sim
                    score = mmr_score

                if score > best_score:
                    best_score = score
                    best_item = candidate

            if best_item is None:
                break

            selected.append(best_item)
            remaining.remove(best_item)

        return selected

    @staticmethod
    def _tokenize_to_set(text: str) -> set[str]:
        lowered = text.lower()
        return set(re.findall(r"[a-z0-9_]+|[\u4e00-\u9fff]", lowered))

    @staticmethod
    def _similarity(text_a: str, token_set_b: set[str]) -> float:
        tokens_a = DiversityRerank._tokenize_to_set(text_a)
        if not tokens_a or not token_set_b:
            return 0.0
        intersection = len(tokens_a.intersection(token_set_b))
        union = len(tokens_a.union(token_set_b))
        return intersection / max(union, 1)
