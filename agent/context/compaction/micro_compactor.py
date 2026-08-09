from __future__ import annotations

import hashlib
import json
import re
from collections import OrderedDict

from llm.chat_message import ChatMessage


class MicroCompactor:
    def __init__(self, max_cache_size: int) -> None:
        self._max_cache_size = max_cache_size
        self._cache: OrderedDict[str, str] = OrderedDict()

    def compact(
        self,
        messages: list[ChatMessage],
        *,
        replace_before_rounds: int,
    ) -> tuple[list[ChatMessage], int]:
        system_messages = [message for message in messages if message.role == "system"]
        non_system = [message for message in messages if message.role != "system"]
        if len(non_system) <= replace_before_rounds:
            return messages, 0

        unchanged_tail = non_system[-replace_before_rounds:]
        candidates = non_system[:-replace_before_rounds]
        replaced_count = 0
        compacted_candidates: list[ChatMessage] = []
        for message in candidates:
            if not self._looks_like_tool_result(message):
                compacted_candidates.append(message)
                continue
            replaced = self._replacement_for_tool_result(message.content)
            compacted_candidates.append(ChatMessage(role=message.role, content=replaced))
            replaced_count += 1
        return system_messages + compacted_candidates + unchanged_tail, replaced_count

    def _replacement_for_tool_result(self, content: str) -> str:
        key = hashlib.sha1(content.encode("utf-8")).hexdigest()
        cached = self._cache.get(key)
        if cached is not None:
            self._cache.move_to_end(key)
            return cached

        tool_name = self._extract_tool_name(content)
        replaced = f"[Previous: used {tool_name}]"

        if len(self._cache) >= self._max_cache_size:
            self._cache.popitem(last=False)

        self._cache[key] = replaced
        return replaced

    @staticmethod
    def _extract_tool_name(content: str) -> str:
        tool_name = "tool"
        stripped = content.strip()
        if stripped.startswith("{") and stripped.endswith("}"):
            try:
                payload = json.loads(stripped)
                tool_name = str(payload.get("tool") or payload.get("tool_name") or tool_name)
            except Exception:  # noqa: BLE001
                pass
        else:
            matched = re.search(r'"tool"\s*:\s*"([^"]+)"', content)
            if matched is not None:
                tool_name = matched.group(1)
        return tool_name

    @staticmethod
    def _looks_like_tool_result(message: ChatMessage) -> bool:
        return message.role == "tool"
