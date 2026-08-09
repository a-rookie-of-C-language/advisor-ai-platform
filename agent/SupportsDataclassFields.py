from __future__ import annotations

from dataclasses import Field as DataclassField
from typing import Protocol


class SupportsDataclassFields(Protocol):
    __dataclass_fields__: dict[str, DataclassField]
