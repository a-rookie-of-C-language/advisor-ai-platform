from __future__ import annotations

from dataclasses import dataclass, field
from typing import Generic, TypeVar

from pydantic import BaseModel

InputModelT = TypeVar("InputModelT", bound=BaseModel)


@dataclass
class ValidationResult(Generic[InputModelT]):
    ok: bool
    data: InputModelT | None = None
    errors: list[str] = field(default_factory=list)

