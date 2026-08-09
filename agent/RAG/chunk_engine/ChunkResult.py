from __future__ import annotations

from dataclasses import dataclass, field

from json_types import JsonObject


@dataclass
class ChunkResult:
    """切片结果，包含文本内容和结构化元数据。"""

    text: str
    metadata: JsonObject = field(default_factory=dict)
