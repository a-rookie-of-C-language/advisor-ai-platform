from __future__ import annotations

from enum import Enum


class SearchMode(str, Enum):
    dense = "dense"
    hybrid = "hybrid"
