from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from llm.base_provider import ToolSpec
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult


class BaseTool(ABC):
    """Base contract for all agent tools."""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        required_permissions: set[ToolPermission] | None = None,
    ) -> None:
        self.name = name
        self.description = description
        self.parameters = parameters
        self.required_permissions = required_permissions or set()

    @abstractmethod
    async def execute(self, tool_args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        """Execute tool and return normalized ToolResult."""

    def to_tool_spec(self) -> ToolSpec:
        return ToolSpec(
            name=self.name,
            description=self.description,
            parameters=self.parameters,
        )

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name!r})"
