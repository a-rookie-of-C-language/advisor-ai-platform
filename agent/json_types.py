from __future__ import annotations

from typing_extensions import TypeAliasType

from SupportsDataclassFields import SupportsDataclassFields
from SupportsModelDump import SupportsModelDump

JsonScalar = str | int | float | bool | None
JsonValue = TypeAliasType("JsonValue", JsonScalar | list["JsonValue"] | dict[str, "JsonValue"])
JsonObject = TypeAliasType("JsonObject", dict[str, JsonValue])


__all__ = [
    "JsonObject",
    "JsonScalar",
    "JsonValue",
    "SupportsDataclassFields",
    "SupportsModelDump",
]
