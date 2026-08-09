from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RAGSearchError:
    code: str
    message: str
