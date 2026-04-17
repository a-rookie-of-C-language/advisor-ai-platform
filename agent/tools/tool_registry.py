from __future__ import annotations

from typing import Any

from llm.base_provider import ToolSpec
from tools.base_tool import BaseTool


class ToolRegistry:
    def __init__(self, enabled_tools: set[str] | None = None) -> None:
        self._tools: dict[str, BaseTool] = {}
        self._enabled_tools = enabled_tools

    def register(self, tool: BaseTool) -> None:
        if self._enabled_tools is not None and tool.name not in self._enabled_tools:
            return
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    def specs(self) -> list[ToolSpec]:
        return [tool.to_tool_spec() for tool in self._tools.values()]

    async def execute(self, name: str, tool_args: dict[str, Any], context: dict[str, Any]) -> str:
        tool = self.get(name)
        if tool is None:
            raise ValueError(f"unsupported tool: {name}")
        return await tool.execute(tool_args, context)
