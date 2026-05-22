from __future__ import annotations

from agent.types import JsonObject, JsonValue
from dataclasses import dataclass
from typing import Dict

from RAG.schema import RAGChunkHit


@dataclass
class RetrievalCandidate:
    score: float
    recall_index: int
    hit: RAGChunkHit
    metadata: JsonObject
