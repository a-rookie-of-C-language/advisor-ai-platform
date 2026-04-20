from __future__ import annotations

from typing import Any

from llm.base_provider import ToolSpec
from tools.base_tool import BaseTool
from tools.tool_permission import PermissionConfig
from tools.tool_result import ToolResult


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
        permission = context.get("permission_config")
        if permission is not None and not isinstance(permission, PermissionConfig):
            raise TypeError("permission_config must be PermissionConfig")

        if permission is not None and not permission.allows_all(tool.required_permissions):
            denied = ToolResult.denied(f"tool permission denied: {name}")
            return denied.to_json()

        result = await tool.execute(tool_args, context)
        return result.to_json()
