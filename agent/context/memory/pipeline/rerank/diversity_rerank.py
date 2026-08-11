from __future__ import annotations

import re
from typing import Dict, List, Set

from context.memory.core.MemoryItem import MemoryItem
from context.memory.pipeline.rerank.base_strategy import BaseMemoryRerankStrategy

# 预编译正则，避免每次调用都重新编译
_RE_TOKEN = re.compile(r"[a-z0-9_]+|[一-鿿]+")


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

        # 🚀 优化：循环外预切所有候选的词，避免内层循环中重复切词
        candidate_tokens: Dict[str, Set[str]] = {}
        for item in remaining:
            candidate_tokens[item.id] = self._tokenize_to_set(item.content)

        while len(selected) < top_k and remaining:
            best_item = None
            best_score = -1.0

            for candidate in remaining:
                relevance = self._jaccard_similarity(candidate_tokens[candidate.id], query_vec)
                if not selected:
                    score = relevance
                else:
                    # 🚀 优化：复用预切好的 tokens，只做集合运算
                    max_sim = max(
                        self._jaccard_similarity(
                            candidate_tokens[candidate.id],
                            candidate_tokens[sel.id],
                        )
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
        return set(_RE_TOKEN.findall(lowered))

    @staticmethod
    def _jaccard_similarity(set_a: set[str], set_b: set[str]) -> float:
        """计算杰卡德相似度，接收已切好的两个集合"""
        if not set_a or not set_b:
            return 0.0
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / max(union, 1)
