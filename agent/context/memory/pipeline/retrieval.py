from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from agent.context.memory.core.governance import MemoryGovernance
from agent.context.memory.core.schema import MemoryItem
from agent.context.memory.pipeline.query_processor import QueryProcessor
from agent.context.memory.pipeline.rerank import ConfidenceDecayRerank, DiversityRerank, MemoryRerankRegistry

logger = logging.getLogger(__name__)

DEFAULT_RERANK_STRATEGY = "confidence_decay_v1"


class MemoryRetrieval:
    def __init__(
        self,
        governance: MemoryGovernance | None = None,
        rerank_registry: MemoryRerankRegistry | None = None,
        query_processor: QueryProcessor | None = None,
        default_rerank_strategy: str = DEFAULT_RERANK_STRATEGY,
    ) -> None:
        self._governance = governance or MemoryGovernance()
        self._query_processor = query_processor or QueryProcessor()
        self._default_rerank_strategy = default_rerank_strategy

        if rerank_registry is not None:
            self._rerank_registry = rerank_registry
        else:
            self._rerank_registry = MemoryRerankRegistry()
            self._rerank_registry.register(ConfidenceDecayRerank(governance=self._governance))
            self._rerank_registry.register(DiversityRerank())

    async def retrieve(
        self,
        api_client,
        user_id: int,
        kb_id: int,
        query: str,
        top_k: int = 6,
        rerank_strategy: str | None = None,
    ) -> list[MemoryItem]:
        t0 = time.monotonic()

        processed_query = self._query_processor.process(query)
        search_text = self._query_processor.build_search_query(processed_query)

        items = await api_client.search_long_term(
            user_id=user_id,
            kb_id=kb_id,
            query=search_text,
            top_k=top_k * 2,
        )
        latency_ms = (time.monotonic() - t0) * 1000
        logger.debug(
            "Memory retrieval: user=%d kb=%d query_len=%d raw=%d latency_ms=%.1f",
            user_id, kb_id, len(query), len(items), latency_ms
        )
        items = self._governance.apply_ttl(items)
        items = self._governance.resolve_conflicts(items)

        strategy_name = rerank_strategy or self._default_rerank_strategy
        strategy = self._rerank_registry.get(strategy_name)
        result = strategy.rank(items, processed_query.normalized, top_k)

        logger.debug(
            "Memory retrieval final: user=%d kb=%d after_filter=%d returned=%d strategy=%s",
            user_id, kb_id, len(items), len(result), strategy_name
        )
        return result

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        import re
        lowered = text.lower()
        return set(re.findall(r"[a-z0-9_]+|[\u4e00-\u9fff]", lowered))
