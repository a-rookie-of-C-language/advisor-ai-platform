from __future__ import annotations

from dataclasses import Field as DataclassField
from typing import Protocol

type JsonScalar = str | int | float | bool | None
type JsonValue = JsonScalar | list[JsonValue] | dict[str, JsonValue]
type JsonObject = dict[str, JsonValue]


class SupportsModelDump(Protocol):
    def model_dump(self) -> JsonObject: ...


class SupportsDataclassFields(Protocol):
    __dataclass_fields__: dict[str, DataclassField]
