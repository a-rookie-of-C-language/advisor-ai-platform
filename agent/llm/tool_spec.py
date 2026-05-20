from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, Any]
    defer_loading: bool = False
    search_hint: str = ""
    is_concurrency_safe: bool = False  # 是否可以并发执行
    is_read_only: bool = False  # 是否是只读操作
