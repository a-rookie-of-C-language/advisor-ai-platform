from __future__ import annotations

import re
import time
import unicodedata
from pathlib import Path

from json_types import JsonObject, JsonValue


def normalize_distance(distance: float) -> float:
    if distance < 0:
        return 0.0
    return round(1.0 / (1.0 + distance), 6)


def to_doc_id(value: JsonValue) -> int:
    try:
        return int(value)
    except Exception:
        return 0


def rewrite_query_text(query: str) -> str:
    normalized = unicodedata.normalize("NFKC", query).strip()
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def tokenize_for_lexical_score(text: str) -> list[str]:
    if not text:
        return []
    lowered = text.lower()
    return re.findall(r"[a-z0-9_]+|[\u4e00-\u9fff]", lowered)


def lexical_score(query: str, text: str) -> float:
    q_tokens = set(tokenize_for_lexical_score(query))
    if not q_tokens:
        return 0.0
    t_tokens = set(tokenize_for_lexical_score(text))
    if not t_tokens:
        return 0.0
    overlap = len(q_tokens.intersection(t_tokens))
    return round(overlap / max(len(q_tokens), 1), 6)


def compute_recall_k(top_k: int, mode: str, use_rerank: bool) -> int:
    if not use_rerank:
        return top_k
    if mode == "hybrid":
        return min(top_k * 6, 100)
    return min(top_k * 3, 100)


def latency_ms(started_at: float) -> int:
    return int((time.time() - started_at) * 1000)


def build_source_type(source: str, metadata: JsonObject) -> str:
    source_type = str(metadata.get("source_type", "")).lower()
    if not source_type and source:
        source_type = Path(source).suffix.replace(".", "").lower()
    return source_type
