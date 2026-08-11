from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Awaitable

from .ChunkAnnotation import ChunkAnnotation


class BaseChunkAnnotator(ABC):
    """切片标注器基类。"""

    name: str = "base"

    @abstractmethod
    def annotate(self, text: str, existing: ChunkAnnotation | None = None) -> ChunkAnnotation:
        """对切片文本进行标注（同步版本）。

        Args:
            text: 切片文本内容
            existing: 前一层标注结果（如有），可用于增强或补充

        Returns:
            ChunkAnnotation 标注结果，confidence 表示置信度 (0~1)
        """
        raise NotImplementedError

    def annotate_async(self, text: str, existing: ChunkAnnotation | None = None) -> Awaitable[ChunkAnnotation]:
        """对切片文本进行标注（异步版本）。

        默认实现：直接调用同步方法。
        子类如需真正的异步实现（如 LLM 调用），应覆盖此方法。

        Args:
            text: 切片文本内容
            existing: 前一层标注结果（如有），可用于增强或补充

        Returns:
            Awaitable[ChunkAnnotation] 标注结果
        """
        import asyncio

        return asyncio.get_event_loop().run_in_executor(None, lambda: self.annotate(text, existing))
