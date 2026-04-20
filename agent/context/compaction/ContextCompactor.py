from __future__ import annotations

from llm.base_provider import ChatMessage


class ContextCompactor:
    """轻量上下文压缩器（Level 1 + Level 3）。"""

    def __init__(
        self,
        *,
        enable_snip: bool,
        enable_context_collapse: bool,
        snip_keep_last: int,
        collapse_keep_last: int,
    ) -> None:
        self._enable_snip = enable_snip
        self._enable_context_collapse = enable_context_collapse
        self._snip_keep_last = max(snip_keep_last, 1)
        self._collapse_keep_last = max(collapse_keep_last, 1)

    def compact_for_model(self, messages: list[ChatMessage]) -> tuple[list[ChatMessage], dict[str, int | bool]]:
        before_tokens = self._estimate_tokens(messages)
        projected = list(messages)

        if self._enable_snip:
            projected = self._apply_keep_last(projected, self._snip_keep_last)

        if self._enable_context_collapse:
            projected = self._apply_keep_last(projected, self._collapse_keep_last)

        after_tokens = self._estimate_tokens(projected)
        released = max(before_tokens - after_tokens, 0)
        return projected, {
            "snip_enabled": self._enable_snip,
            "collapse_enabled": self._enable_context_collapse,
            "tokens_before": before_tokens,
            "tokens_after": after_tokens,
            "tokens_released": released,
        }

    @staticmethod
    def _estimate_tokens(messages: list[ChatMessage]) -> int:
        total = 0
        for message in messages:
            # 经验估算：中文/英文混合场景下用 4 字符近似 1 token。
            total += (len(message.content) // 4) + 1
        return total

    @staticmethod
    def _apply_keep_last(messages: list[ChatMessage], keep_last_non_system: int) -> list[ChatMessage]:
        system_messages = [message for message in messages if message.role == "system"]
        non_system = [message for message in messages if message.role != "system"]
        tail = non_system[-keep_last_non_system:]
        return system_messages + tail

