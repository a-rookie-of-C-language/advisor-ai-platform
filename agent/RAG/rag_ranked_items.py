from __future__ import annotations

from typing import Dict, List

from RAG.rerank_strategy import RetrievalCandidate
from RAG.schema import RAGChunkHit


def build_ranked_items(
    ranked_rows: List[RetrievalCandidate],
    live_title_map: Dict[int, str],
) -> List[RAGChunkHit]:
    items: List[RAGChunkHit] = []
    for rank, row in enumerate(ranked_rows, start=1):
        hit = row.hit
        if hit.doc_id > 0 and hit.doc_id in live_title_map:
            hit.doc_title = live_title_map[hit.doc_id]
        hit.rank = rank
        items.append(hit)
    return items
