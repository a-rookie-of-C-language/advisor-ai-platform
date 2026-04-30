from __future__ import annotations

from dataclasses import replace

import pytest

from RAG.rerank_strategy import BaseRerankStrategy, RerankStrategyRegistry
from RAG.rerank_strategy.RetrievalCandidate import RetrievalCandidate
from RAG.schema import RAGChunkHit, ScoreType


def _candidate(score: float, recall_index: int, chunk_id: str) -> RetrievalCandidate:
    return RetrievalCandidate(
        score=score,
        recall_index=recall_index,
        hit=RAGChunkHit(
            chunk_id=chunk_id,
            doc_id=1,
            doc_title="t",
            source="s",
            source_type="txt",
            text="x",
            score=score,
            score_type=ScoreType.similarity,
            rank=recall_index + 1,
            metadata={},
        ),
        metadata={},
    )


class _AddScoreStrategy(BaseRerankStrategy):
    def __init__(self, name: str, order: int, delta: float, enabled: bool = True) -> None:
        self._name = name
        self.order = order
        self.enabled = enabled
        self._delta = delta

    @property
    def name(self) -> str:
        return self._name

    def rank(self, candidates: list[RetrievalCandidate], top_k: int) -> list[RetrievalCandidate]:
        updated = [replace(row, score=row.score + self._delta) for row in candidates]
        return updated[:top_k]


def test_registry_returns_enabled_processors_by_order() -> None:
    registry = RerankStrategyRegistry()
    registry.register(_AddScoreStrategy(name="late", order=300, delta=0.3))
    registry.register(_AddScoreStrategy(name="disabled", order=100, delta=10.0, enabled=False))
    registry.register(_AddScoreStrategy(name="early", order=200, delta=0.2))

    ordered = registry.get_enabled_ordered()
    assert [processor.name for processor in ordered] == ["early", "late"]


def test_pipeline_chain_respects_order_and_enabled() -> None:
    registry = RerankStrategyRegistry()
    registry.register(_AddScoreStrategy(name="s1", order=200, delta=0.1))
    registry.register(_AddScoreStrategy(name="s2", order=100, delta=0.2))
    registry.register(_AddScoreStrategy(name="skip", order=50, delta=10.0, enabled=False))

    rows = [_candidate(0.5, 0, "c1"), _candidate(0.4, 1, "c2")]
    for processor in registry.get_enabled_ordered():
        rows = processor.rank(rows, top_k=len(rows))

    assert rows[0].score == pytest.approx(0.8)
    assert rows[1].score == pytest.approx(0.7)
