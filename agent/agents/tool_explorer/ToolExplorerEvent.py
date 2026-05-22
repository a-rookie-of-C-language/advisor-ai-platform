from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ToolExplorerEvent:
    event: str
    payload: dict[str, Any]
