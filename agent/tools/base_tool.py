from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from llm.base_provider import ToolSpec


class BaseTool(ABC):
    """Base contract for all agent tools."""

    def __init__(self, name: str, description: str, parameters: dict[str, Any]) -> None:
        self.name = name
        self.description = description
        self.parameters = parameters

    @abstractmethod
    async def execute(self, tool_args: dict[str, Any], context: dict[str, Any]) -> str:
        """Execute tool and return JSON string payload."""

    def to_tool_spec(self) -> ToolSpec:
        return ToolSpec(
            name=self.name,
            description=self.description,
            parameters=self.parameters,
        )

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name!r})"
