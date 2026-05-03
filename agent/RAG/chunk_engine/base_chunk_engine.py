from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List

from .file_profile import FileProfile


@dataclass
class ChunkResult:
    """切片结果，包含文本内容和结构化元数据。"""

    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    # metadata 关键字段:
    #   page_number: int     — 页码
    #   type: str            — 数据类型 (product / policy / general)
    #   authority: str       — 权威性 (official / secondary)
    #   effective_date: str  — 生效日期 (ISO 格式)


class BaseChunkEngine(ABC):
    """Extract + split text chunks from source file."""

    name: str = "base"

    @abstractmethod
    def can_handle(self, profile: FileProfile) -> float:
        raise NotImplementedError

    @abstractmethod
    def extract_text(self, file_path: Path) -> str:
        raise NotImplementedError

    def split_text(
        self,
        text: str,
        chunk_size: int = 800,
        overlap: int = 120,
        base_metadata: Dict[str, Any] | None = None,
    ) -> List[ChunkResult]:
        clean = (text or "").strip()
        if not clean:
            return []

        meta = base_metadata or {}
        chunks: List[ChunkResult] = []
        start = 0
        n = len(clean)
        while start < n:
            end = min(start + chunk_size, n)
            piece = clean[start:end].strip()
            if piece:
                chunks.append(ChunkResult(text=piece, metadata=dict(meta)))
            if end == n:
                break
            start = max(0, end - overlap)
        return chunks

    def chunk(self, file_path: Path) -> List[ChunkResult]:
        text = self.extract_text(file_path)
        return self.split_text(text)
