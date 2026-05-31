from __future__ import annotations

from typing import Protocol


class McpToolAnnotationsProtocol(Protocol):
    readOnlyHint: bool
    destructiveHint: bool
    openWorldHint: bool
