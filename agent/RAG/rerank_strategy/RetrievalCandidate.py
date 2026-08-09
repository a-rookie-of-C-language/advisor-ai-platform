from __future__ import annotations

from dataclasses import dataclass

from json_types import JsonObject
from RAG.schema import RAGChunkHit


@dataclass
class RetrievalCandidate:
    score: float
    recall_index: int
    hit: RAGChunkHit
    metadata: JsonObject
