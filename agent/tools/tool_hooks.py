from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from tools.tool_result import ToolResult

# ------------------------------------------------------------------
# 钩子类型定义
# ------------------------------------------------------------------

# before 钩子：(should_proceed, value)
#   should_proceed=True  → value 是修改后的 tool_input（None 表示不修改原始输入）
#   should_proceed=False → value 是 ToolResult（短路线，跳过工具执行直接返回）
BeforeHook = Callable[[str, Any, dict[str, Any]], Awaitable[tuple[bool, Any]]]

# after 钩子：返回变换后的 ToolResult
AfterHook = Callable[[str, Any, ToolResult, dict[str, Any]], Awaitable[ToolResult]]

# ------------------------------------------------------------------
# 内置钩子
# ------------------------------------------------------------------


class LoggingHook:
    """内置 after 钩子：记录每次工具调用的结果。"""

    def __init__(
        self,
        logger: logging.Logger | None = None,
        *,
        args_max_chars: int = 200,
    ) -> None:
        self._logger = logger or logging.getLogger(__name__)
        self._args_max_chars = max(args_max_chars, 20)

    async def __call__(
        self,
        tool_name: str,
        tool_input: Any,
        result: ToolResult,
        context: dict[str, Any],
    ) -> ToolResult:
        _ = context
        try:
            args_summary = str(tool_input)[: self._args_max_chars]
        except Exception:
            args_summary = "<unserializable>"
        self._logger.info(
            "tool_executed: name=%s ok=%s status=%s args=%s",
            tool_name,
            result.ok,
            result.status,
            args_summary,
        )
        return result
