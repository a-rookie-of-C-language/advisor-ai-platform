from __future__ import annotations

from agent.types import JsonObject, JsonValue
from dataclasses import dataclass


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: JsonObject
    defer_loading: bool = False
    search_hint: str = ""
    is_concurrency_safe: bool = False  # 是否可以并发执行
    is_read_only: bool = False  # 是否是只读操作
