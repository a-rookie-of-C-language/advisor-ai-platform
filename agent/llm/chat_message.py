from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ChatMessage:
    role: str
    content: str
    attachments: list[dict] | None = field(default=None)
