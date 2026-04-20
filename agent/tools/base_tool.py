from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

from llm.base_provider import ToolSpec
from pydantic import BaseModel, ValidationError
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult
from tools.validation_result import ValidationResult

InputModelT = TypeVar("InputModelT", bound=BaseModel)
OutputModelT = TypeVar("OutputModelT", bound=BaseModel)


class BaseTool(Generic[InputModelT, OutputModelT], ABC):
    """Base contract for all agent tools."""

    def __init__(
        self,
        name: str,
        description: str,
        input_model: type[InputModelT],
        input_json_schema: dict[str, Any] | None = None,
        output_model: type[OutputModelT] | None = None,
        required_permissions: set[ToolPermission] | None = None,
    ) -> None:
        self.name = name
        self.description = description
        self.input_model = input_model
        self._input_json_schema = input_json_schema
        self.output_model = output_model
        self.required_permissions = required_permissions or set()

    @abstractmethod
    async def execute(self, tool_input: InputModelT, context: dict[str, Any]) -> ToolResult:
        """Execute tool and return normalized ToolResult."""

    async def validate_input(self, input_payload: dict[str, Any]) -> ValidationResult[InputModelT]:
        try:
            parsed = self.input_model.model_validate(input_payload or {})
            return ValidationResult(ok=True, data=parsed)
        except ValidationError as exc:
            errors = []
            for issue in exc.errors():
                location = ".".join(str(item) for item in issue.get("loc", []))
                message = issue.get("msg", "invalid input")
                errors.append(f"{location}: {message}" if location else message)
            return ValidationResult(ok=False, errors=errors)
        except Exception as exc:  # noqa: BLE001
            return ValidationResult(ok=False, errors=[str(exc)])

    def input_json_schema(self) -> dict[str, Any]:
        if self._input_json_schema is not None:
            return self._input_json_schema
        return self.input_model.model_json_schema()

    def output_json_schema(self) -> dict[str, Any] | None:
        if self.output_model is None:
            return None
        return self.output_model.model_json_schema()

    def to_tool_spec(self) -> ToolSpec:
        return ToolSpec(
            name=self.name,
            description=self.description,
            parameters=self.input_json_schema(),
        )

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name!r})"
