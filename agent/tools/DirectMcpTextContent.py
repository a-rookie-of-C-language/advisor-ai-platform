from __future__ import annotations


class DirectMcpTextContent:
    def __init__(self, text: str) -> None:
        self.type = "text"
        self.text = text
        self.data = None
