from __future__ import annotations

import uuid
from typing import Any

from llm.tool_spec import ToolSpec
from tools.base_tool import BaseTool
from tools.tool_permission import PermissionConfig
from tools.tool_result import ToolResult


class ToolRegistry:
    def __init__(self, enabled_tools: set[str] | None = None) -> None:
        self._tools: dict[str, BaseTool] = {}
        self._enabled_tools = enabled_tools
        self._pending_callbacks: dict[str, dict[str, Any]] = {}

    def register(self, tool: BaseTool) -> None:
        if self._enabled_tools is not None and tool.name not in self._enabled_tools:
            return
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    def specs(self) -> list[ToolSpec]:
        return [tool.to_tool_spec() for tool in self._tools.values()]

    def specs_by_categories(self, categories: set[str]) -> list[ToolSpec]:
        """返回指定 category 下的 tool specs，用于意图路由后按需注入。"""
        return [tool.to_tool_spec() for tool in self._tools.values() if tool.category in categories]

    def all_categories(self) -> set[str]:
        """返回当前注册的所有 tool category。"""
        return {tool.category for tool in self._tools.values()}

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

        # 三态权限检查
        if permission is not None:
            for req in tool.required_permissions:
                mode = permission.get_tool_mode(req)
                if mode == "deny":
                    denied = ToolResult.denied(f"tool permission denied: {name}")
                    denied.meta = safety_meta
                    return denied.to_json()
                if mode == "ask":
                    callback_id = uuid.uuid4().hex
                    self._pending_callbacks[callback_id] = {
                        "tool_name": name,
                        "tool_args": tool_args,
                        "tool_input": tool_input,
                        "context": context,
                        "safety_meta": safety_meta,
                    }
                    pending = ToolResult.pending(
                        message=f"tool requires user confirmation: {name}",
                        callback_id=callback_id,
                    )
                    pending.meta = safety_meta
                    return pending.to_json()

        result = await tool.execute(tool_input, context)
        if not result.meta:
            result.meta = {}
        for key, value in safety_meta.items():
            result.meta[key] = value
        return result.to_json()

    async def confirm_execute(self, callback_id: str, confirmed: bool) -> str:
        """客户端确认/拒绝 pending 的工具调用。

        Args:
            callback_id: 由 execute() 在 ask 模式下生成的回调 ID
            confirmed: 用户是否确认执行

        Returns:
            工具执行结果的 JSON 字符串
        """
        pending = self._pending_callbacks.pop(callback_id, None)
        if pending is None:
            return ToolResult.error(f"callback not found or expired: {callback_id}").to_json()

        if not confirmed:
            denied = ToolResult.denied("user denied tool execution")
            denied.meta = pending["safety_meta"]
            return denied.to_json()

        tool = self.get(pending["tool_name"])
        if tool is None:
            return ToolResult.error(f"tool not found: {pending['tool_name']}").to_json()

        result = await tool.execute(pending["tool_input"], pending["context"])
        if not result.meta:
            result.meta = {}
        for key, value in pending["safety_meta"].items():
            result.meta[key] = value
        return result.to_json()
