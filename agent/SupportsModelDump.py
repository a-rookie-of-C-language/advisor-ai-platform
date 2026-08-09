from __future__ import annotations

from typing import Any, Protocol


class SupportsModelDump(Protocol):
    def model_dump(self) -> dict[str, Any]: ...
