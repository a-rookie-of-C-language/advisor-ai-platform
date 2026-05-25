from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from json_types import JsonObject


@dataclass
class RAGSearchFilters:
    doc_ids: Optional[List[int]] = None
    source_types: Optional[List[str]] = None
    metadata: Optional[JsonObject] = None
