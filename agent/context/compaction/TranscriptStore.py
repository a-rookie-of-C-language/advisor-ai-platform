from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from llm.chat_message import ChatMessage


class TranscriptStore:
    def __init__(self, base_dir: str) -> None:
        self._base_dir = Path(base_dir)
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, session_id: int | None, messages: list[ChatMessage]) -> str:
        now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        session_part = str(session_id) if session_id is not None else "unknown"
        filename = f"session_{session_part}_{now}.jsonl"
        target = self._base_dir / filename
        with target.open("w", encoding="utf-8") as file:
            for message in messages:
                file.write(
                    json.dumps(
                        {"role": message.role, "content": message.content},
                        ensure_ascii=False,
                    )
                )
                file.write("\n")
        return str(target)

