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

        validation = await tool.validate_input(tool_args)
        if not validation.ok or validation.data is None:
            return ToolResult(
                ok=False,
                status="error",
                message="tool_input_validation_failed",
                items=[],
                meta={"errors": validation.errors},
            ).to_json()
        tool_input = validation.data
        try:
            safety_meta = {
                "loading": {
                    "should_defer": tool.get_should_defer(),
                    "always_load": tool.get_always_load(),
                },
                "feature": {
                    "is_enabled": tool.get_is_enabled(),
                },
                "execution": {
                    "is_concurrency_safe": tool.get_is_concurrency_safe(tool_input),
                    "is_destructive": tool.get_is_destructive(tool_input),
                    "is_read_only": tool.get_is_read_only(),
                    "interrupt_behavior": tool.get_interrupt_behavior(),
                    "requires_user_interaction": tool.get_requires_user_interaction(),
                },
                "permission_matcher": tool.get_permission_matcher(tool_input),
            }
        except ValueError as exc:
            return ToolResult(
                ok=False,
                status="error",
                message="tool_configuration_invalid",
                items=[],
                meta={"errors": [str(exc)]},
            ).to_json()

        if not safety_meta["feature"]["is_enabled"]:
            denied = ToolResult.denied("tool_disabled")
            denied.meta = safety_meta
            return denied.to_json()

        permission = context.get("permission_config")
        if permission is not None and not isinstance(permission, PermissionConfig):
            raise TypeError("permission_config must be PermissionConfig")

        if permission is not None and not permission.allows_all(tool.required_permissions):
            denied = ToolResult.denied(f"tool permission denied: {name}")
            denied.meta = safety_meta
            return denied.to_json()

        result = await tool.execute(tool_input, context)
        if not result.meta:
            result.meta = {}
        for key, value in safety_meta.items():
            result.meta[key] = value
        return result.to_json()
