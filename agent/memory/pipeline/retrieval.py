from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from memory.core.governance import MemoryGovernance
from memory.core.schema import MemoryItem

logger = logging.getLogger(__name__)


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
        t0 = time.monotonic()
        items = await api_client.search_long_term(
            user_id=user_id,
            kb_id=kb_id,
            query=query,
            top_k=top_k * 2,
        )
        latency_ms = (time.monotonic() - t0) * 1000
        logger.debug(
            "Memory retrieval: user=%d kb=%d query_len=%d raw=%d latency_ms=%.1f",
            user_id, kb_id, len(query), len(items), latency_ms
        )
        items = self._governance.apply_ttl(items)
        items = self._governance.resolve_conflicts(items)
        result = self.rerank(items, query)[:top_k]
        logger.debug(
            "Memory retrieval final: user=%d kb=%d after_filter=%d returned=%d",
            user_id, kb_id, len(items), len(result)
        )
        return result

    def rerank(self, items: list[MemoryItem], query: str) -> list[MemoryItem]:
        query_tokens = self._tokens(query)
        now = datetime.now(timezone.utc)

        def score(item: MemoryItem) -> float:
            content_tokens = self._tokens(item.content)
            overlap = len(query_tokens.intersection(content_tokens))
            lexical = overlap / max(len(query_tokens), 1)
            decay = self._governance.compute_time_decay(item, now=now)
            return 0.50 * item.score + 0.30 * item.confidence + 0.20 * decay + 0.10 * lexical

        return sorted(items, key=score, reverse=True)

    @staticmethod
    def _tokens(text: str) -> set[str]:
        return {token for token in text.lower().split() if token}
