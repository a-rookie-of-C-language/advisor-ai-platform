from __future__ import annotations

from dataclasses import dataclass

from json_types import JsonObject
from RAG.ScoreType import ScoreType


@dataclass
class RAGChunkHit:
    chunk_id: str
    doc_id: int
    doc_title: str
    source: str
    source_type: str
    text: str
    score: float
    score_type: ScoreType
    rank: int
    metadata: JsonObject
