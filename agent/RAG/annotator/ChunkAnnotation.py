from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass
class ChunkAnnotation:
    """切片标注结果。"""

    type: str = "general"
    authority: str = "secondary"
    effective_date: str = ""
    confidence: float = 0.0
    source: str = ""
    extra: JsonObject = field(default_factory=dict)
