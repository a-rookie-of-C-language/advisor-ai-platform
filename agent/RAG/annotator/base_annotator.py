from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class ChunkAnnotation:
    """切片标注结果。"""

    type: str = "general"
    authority: str = "secondary"
    effective_date: str = ""
    confidence: float = 0.0
    source: str = ""
    extra: Dict[str, Any] = field(default_factory=dict)


class BaseChunkAnnotator(ABC):
    """切片标注器基类。"""

    name: str = "base"

    @abstractmethod
    def annotate(self, text: str, existing: ChunkAnnotation | None = None) -> ChunkAnnotation:
        """对切片文本进行标注。

        Args:
            text: 切片文本内容
            existing: 前一层标注结果（如有），可用于增强或补充

        Returns:
            ChunkAnnotation 标注结果，confidence 表示置信度 (0~1)
        """
        raise NotImplementedError
