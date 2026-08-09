from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from json_types import JsonObject
from memory.FailureMemoryItem import FailureMemoryItem


class FailureMemoryStore:
    def __init__(self, base_dir: str) -> None:
        self._base_dir = Path(base_dir)
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def append(self, item: FailureMemoryItem) -> None:
        path = self._base_dir / f"{datetime.now().strftime('%Y%m%d')}.jsonl"
        with path.open("a", encoding="utf-8") as fp:
            fp.write(json.dumps(item.to_dict(), ensure_ascii=False) + "\n")

    def load_recent(self, limit: int = 200) -> list[JsonObject]:
        files = sorted(self._base_dir.glob("*.jsonl"), reverse=True)
        out: list[JsonObject] = []
        for file in files:
            with file.open("r", encoding="utf-8") as fp:
                for line in fp:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        out.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
                    if len(out) >= limit:
                        return out
        return out
