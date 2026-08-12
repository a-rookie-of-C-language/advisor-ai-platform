from __future__ import annotations

import uuid

from json_types import JsonObject
from llm.tool_spec import ToolSpec
from tools.core.base_tool import BaseTool
from tools.core.tool_result import ToolResult
from tools.permissions.tool_permission import PermissionConfig, ToolPermission
from tools.registry.tool_hooks import AfterHook, BeforeHook


class ToolRegistry:
    def __init__(self, enabled_tools: set[str] | None = None) -> None:
        self._tools: dict[str, BaseTool] = {}
        self._enabled_tools = enabled_tools
        self._pending_callbacks: dict[str, JsonObject] = {}
        self._before_hooks: list[BeforeHook] = []
        self._after_hooks: list[AfterHook] = []

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

    def specs_by_names(self, names: list[str]) -> list[ToolSpec]:
        """返回指定工具名的 tool specs，用于意图路由根据查询模式匹配的工具。"""
        return [self._tools[name].to_tool_spec() for name in names if name in self._tools]

    def all_categories(self) -> set[str]:
        """返回当前注册的所有 tool category。"""
        return {tool.category for tool in self._tools.values()}

    def allowed_categories(self, permission: PermissionConfig | None) -> set[str]:
        if permission is None:
            return self.all_categories()
        return {tool.category for tool in self._tools.values() if permission.allows_all(tool.required_permissions)}

    def allowed_specs(self, permission: PermissionConfig | None) -> list[ToolSpec]:
        if permission is None:
            return self.specs()
        return [
            tool.to_tool_spec() for tool in self._tools.values() if permission.allows_all(tool.required_permissions)
        ]

    def add_before_hook(self, hook: BeforeHook) -> None:
        """注册 before 钩子：在工具执行前调用，可修改输入或短路线。"""
        self._before_hooks.append(hook)

    def add_after_hook(self, hook: AfterHook) -> None:
        """注册 after 钩子：在工具执行后调用，可变换输出结果。"""
        self._after_hooks.append(hook)

    async def execute(self, name: str, tool_args: JsonObject, context: JsonObject) -> str:
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
            permission = self._coerce_permission_config(permission)
            context["permission_config"] = permission

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

        result = await tool.execute_with_idempotency(tool_input, context)
        if not result.meta:
            result.meta = {}
        for key, value in safety_meta.items():
            result.meta[key] = value
        return result.to_json()

    @staticmethod
    def _coerce_permission_config(permission: object) -> PermissionConfig:
        if isinstance(permission, dict):
            tool_modes_raw = permission.get("tool_modes", {})
            tool_modes: dict[ToolPermission, str] = {}
            if isinstance(tool_modes_raw, dict):
                for name, mode in tool_modes_raw.items():
                    try:
                        tool_modes[ToolPermission(str(name))] = str(mode)
                    except ValueError:
                        continue
            read_resources_raw = permission.get("read_resources", [])
            write_resources_raw = permission.get("write_resources", [])
            read_resources = {str(item) for item in read_resources_raw if isinstance(item, (str, int, float))}
            write_resources = {str(item) for item in write_resources_raw if isinstance(item, (str, int, float))}
            default_mode = str(permission.get("default_mode", "deny"))
            if default_mode not in {"allow", "ask", "deny"}:
                default_mode = "deny"
            return PermissionConfig(
                tool_modes=tool_modes,
                default_mode=default_mode if default_mode in {"allow", "ask", "deny"} else "deny",
                read_resources=read_resources,
                write_resources=write_resources,
            )
        raise TypeError("permission_config must be PermissionConfig")

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

        result = await tool.execute_with_idempotency(pending["tool_input"], pending["context"])
        if not result.meta:
            result.meta = {}
        for key, value in pending["safety_meta"].items():
            result.meta[key] = value
        return result.to_json()
