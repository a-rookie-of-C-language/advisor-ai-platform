from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from tools.permissions.ToolPermission import ToolPermission

ToolMode = Literal["allow", "ask", "deny"]


@dataclass
class PermissionConfig:
    tool_modes: dict[ToolPermission, ToolMode] = field(default_factory=dict)
    default_mode: ToolMode = "deny"
    read_resources: set[str] = field(default_factory=lambda: {"context", "memory"})
    write_resources: set[str] = field(default_factory=set)

    def get_tool_mode(self, tool: ToolPermission) -> ToolMode:
        return self.tool_modes.get(tool, self.default_mode)

    def allows_tool(self, tool: ToolPermission) -> bool:
        return self.get_tool_mode(tool) == "allow"

    def asks_tool(self, tool: ToolPermission) -> bool:
        return self.get_tool_mode(tool) == "ask"

    def denies_tool(self, tool: ToolPermission) -> bool:
        return self.get_tool_mode(tool) == "deny"

    def allows_all(self, required: set[ToolPermission]) -> bool:
        return all(self.get_tool_mode(tool) != "deny" for tool in required)

    def allows_read(self, resource: str) -> bool:
        return resource in self.read_resources

    def allows_write(self, resource: str) -> bool:
        return resource in self.write_resources

    def is_subset_of(self, other: "PermissionConfig") -> bool:
        for tool, mode in self.tool_modes.items():
            other_mode = other.get_tool_mode(tool)
            if mode == "allow" and other_mode != "allow":
                return False
            if mode == "ask" and other_mode == "deny":
                return False
        return (
            self.read_resources.issubset(other.read_resources)
            and self.write_resources.issubset(other.write_resources)
        )

    @classmethod
    def from_allowed_tools(
        cls,
        allowed: set[ToolPermission],
        *,
        read_resources: set[str] | None = None,
        write_resources: set[str] | None = None,
    ) -> "PermissionConfig":
        modes: dict[ToolPermission, ToolMode] = {tool: "allow" for tool in allowed}
        kwargs: dict = {"tool_modes": modes}
        if read_resources is not None:
            kwargs["read_resources"] = read_resources
        if write_resources is not None:
            kwargs["write_resources"] = write_resources
        return cls(**kwargs)
