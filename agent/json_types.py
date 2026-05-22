from __future__ import annotations

from dataclasses import Field as DataclassField
from typing import Protocol

from typing_extensions import TypeAliasType

JsonScalar = str | int | float | bool | None
JsonValue = TypeAliasType("JsonValue", JsonScalar | list["JsonValue"] | dict[str, "JsonValue"])
JsonObject = TypeAliasType("JsonObject", dict[str, JsonValue])


class SupportsModelDump(Protocol):
    def model_dump(self) -> JsonObject: ...


class SupportsDataclassFields(Protocol):
    __dataclass_fields__: dict[str, DataclassField]
