from __future__ import annotations


class ChatStreamAnswerBuffer:
    def __init__(self, *, debug_enabled: bool, preview_limit: int = 200) -> None:
        self._debug_enabled = debug_enabled
        self._preview_limit = max(0, preview_limit)
        self._parts: list[str] = []
        self._debug_preview: list[str] = []
        self._debug_chars = 0
        self._delta_count = 0

    def append(self, delta: str) -> None:
        self._parts.append(delta)
        if not self._debug_enabled:
            return
        if self._debug_chars < self._preview_limit:
            remain = self._preview_limit - self._debug_chars
            piece = delta[:remain]
            if piece:
                self._debug_preview.append(piece)
                self._debug_chars += len(piece)
        self._delta_count += 1

    @property
    def answer(self) -> str:
        return "".join(self._parts).strip()

    @property
    def debug_preview(self) -> str:
        return "".join(self._debug_preview)

    @property
    def delta_count(self) -> int:
        return self._delta_count
