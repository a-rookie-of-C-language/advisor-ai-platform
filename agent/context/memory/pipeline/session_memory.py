from __future__ import annotations

import re

from context.memory.core.governance import MemoryGovernance
from context.memory.core.schema import SessionSummary


class SessionMemory:
    def __init__(self, governance: MemoryGovernance | None = None) -> None:
        self._governance = governance or MemoryGovernance()

    def load_recent(self, messages: list[dict[str, str]], max_turns: int = 8) -> list[dict[str, str]]:
        if max_turns <= 0:
            return []
        max_messages = max_turns * 2
        return messages[-max_messages:]

    def estimate_tokens(self, messages: list[dict[str, str]]) -> int:
        total = 0.0
        for message in messages:
            content = message.get("content", "")
            zh_chars = len(re.findall(r"[\u4e00-\u9fff]", content))
            en_words = len(re.findall(r"[A-Za-z0-9_]+", content))
            punct = len(re.findall(r"[^\w\s]", content))
            total += zh_chars + (en_words * 1.3) + (punct * 0.5)
        return int(total)

    def should_summarize(self, messages: list[dict[str, str]]) -> bool:
        turn_trigger = len(messages) >= self._governance.summary_turn_threshold * 2
        token_trigger = self.estimate_tokens(messages) >= self._governance.summary_token_threshold
        return turn_trigger or token_trigger

    def build_summary_input(self, messages: list[dict[str, str]], window_size: int = 20) -> str:
        selected = messages[-window_size:]
        lines: list[str] = []
        for message in selected:
            role = message.get("role", "unknown")
            content = message.get("content", "")
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    @staticmethod
    def empty_summary(session_id: int) -> SessionSummary:
        return SessionSummary(session_id=session_id, summary="")
