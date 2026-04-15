from __future__ import annotations

from memory.core.schema import SessionSummary


class SessionMemory:
    def load_recent(self, messages: list[dict[str, str]], max_turns: int = 8) -> list[dict[str, str]]:
        if max_turns <= 0:
            return []
        max_messages = max_turns * 2
        return messages[-max_messages:]

    def should_summarize(self, messages: list[dict[str, str]], threshold_turns: int = 10) -> bool:
        return len(messages) >= threshold_turns * 2

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
