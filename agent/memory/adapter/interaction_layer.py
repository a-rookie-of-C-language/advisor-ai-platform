from __future__ import annotations


class InteractionLayer:
    def __init__(self) -> None:
        self._messages: list[dict[str, str]] = []

    def add_user_message(self, content: str) -> None:
        self._messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str) -> None:
        self._messages.append({"role": "assistant", "content": content})

    def add_system_message(self, content: str) -> None:
        self._messages.append({"role": "system", "content": content})

    def add_tool_message(self, content: str) -> None:
        self._messages.append({"role": "tool", "content": content})

    def to_messages(self) -> list[dict[str, str]]:
        return list(self._messages)

    def reset(self) -> None:
        self._messages.clear()
