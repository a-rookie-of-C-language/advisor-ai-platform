from __future__ import annotations

from memory.core.governance import MemoryGovernance
from memory.core.schema import MemoryItem


class MemoryRetrieval:
    def __init__(self, governance: MemoryGovernance | None = None) -> None:
        self._governance = governance or MemoryGovernance()

    async def retrieve(
        self,
        api_client,
        user_id: int,
        kb_id: int,
        query: str,
        top_k: int = 6,
    ) -> list[MemoryItem]:
        items = await api_client.search_long_term(
            user_id=user_id,
            kb_id=kb_id,
            query=query,
            top_k=top_k * 2,
        )
        items = self._governance.apply_ttl(items)
        items = self._governance.resolve_conflicts(items)
        return self.rerank(items, query)[:top_k]

    def rerank(self, items: list[MemoryItem], query: str) -> list[MemoryItem]:
        query_tokens = self._tokens(query)

        def score(item: MemoryItem) -> float:
            content_tokens = self._tokens(item.content)
            overlap = len(query_tokens.intersection(content_tokens))
            lexical = overlap / max(len(query_tokens), 1)
            return 0.65 * item.confidence + 0.25 * item.score + 0.10 * lexical

        return sorted(items, key=score, reverse=True)

    @staticmethod
    def _tokens(text: str) -> set[str]:
        return {token for token in text.lower().split() if token}
