from __future__ import annotations

from dataclasses import asdict as dataclass_asdict

from json_types import JsonValue, SupportsDataclassFields


def to_jsonable(obj: JsonValue | SupportsDataclassFields) -> JsonValue:
    if hasattr(obj, "__dataclass_fields__"):
        return dataclass_asdict(obj)
    if isinstance(obj, dict):
        return {key: to_jsonable(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_jsonable(item) for item in obj]
    return obj
