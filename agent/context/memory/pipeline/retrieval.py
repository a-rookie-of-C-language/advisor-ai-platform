from __future__ import annotations

import logging
import re
import time

from context.memory.core.governance import MemoryGovernance
from context.memory.core.MemoryItem import MemoryItem
from context.memory.pipeline.query_processor import QueryProcessor
from context.memory.pipeline.rerank import ConfidenceDecayRerank, DiversityRerank, MemoryRerankRegistry

logger = logging.getLogger(__name__)

DEFAULT_RERANK_STRATEGY = "confidence_decay_v1"

# Episodic query markers (Chinese + English)
_EPISODIC_MARKERS = re.compile(
    r"\u4e0a\u6b21|\u4e4b\u524d|\u66fe\u7ecf|\u90a3\u6b21|\u6628\u5929|\u4e0a\u5468|\u4e0a\u4e2a\u6708|\u53bb\u5e74|\u524d\u5929|\u90a3\u5929|\u5f53\u65f6|\u540e\u6765"
    r"|last\s*time|previously|once|yesterday|last\s*week|last\s*month|last\s*year|ago|then",
    re.IGNORECASE,
)


def _infer_query_type(query: str) -> str:
    """Infer whether the query is asking for episodic or semantic memory."""
    if _EPISODIC_MARKERS.search(query):
        return "episodic"
    return "semantic"


def _compute_type_weights(query_type: str) -> dict[str, float]:
    """Compute type weights based on inferred query type."""
    if query_type == "episodic":
        return {"semantic": 0.3, "episodic": 0.7}
    return {"semantic": 0.8, "episodic": 0.2}


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

        # Infer query type and compute type weights for weighted retrieval
        query_type = _infer_query_type(query)
        type_weights = _compute_type_weights(query_type)

        items = await api_client.search_long_term(
            user_id=user_id,
            kb_id=kb_id,
            query=search_text,
            top_k=top_k * 2,
            type_weights=type_weights,
        )
        latency_ms = (time.monotonic() - t0) * 1000
        logger.debug(
            "Memory retrieval: user=%d kb=%d query_len=%d query_type=%s raw=%d latency_ms=%.1f",
            user_id,
            kb_id,
            len(query),
            query_type,
            len(items),
            latency_ms,
        )
        items = self._governance.apply_ttl(items)
        items = self._governance.resolve_conflicts(items)

        strategy_name = rerank_strategy or self._default_rerank_strategy
        strategy = self._rerank_registry.get(strategy_name)
        result = strategy.rank(items, processed_query.normalized, top_k)

        logger.debug(
            "Memory retrieval final: user=%d kb=%d after_filter=%d returned=%d strategy=%s",
            user_id,
            kb_id,
            len(items),
            len(result),
            strategy_name,
        )
        return result

    async def retrieve_core(
        self,
        api_client,
        user_id: int,
        kb_id: int,
    ) -> list[MemoryItem]:
        """Retrieve core memories that should always be injected."""
        try:
            core_items = await api_client.get_core_memories(user_id, kb_id)
            logger.debug("Core memories loaded: user=%d kb=%d count=%d", user_id, kb_id, len(core_items))
            return core_items
        except Exception as e:
            logger.warning("Failed to load core memories: %s", e)
            return []

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        lowered = text.lower()
        return set(re.findall(r"[a-z0-9_]+|[\u4e00-\u9fff]", lowered))
