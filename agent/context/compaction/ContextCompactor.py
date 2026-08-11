from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable

from context.compaction.compaction_transforms import (
    apply_autocompact,
    apply_keep_last,
    estimate_tokens,
    to_transcript_text,
)
from context.compaction.micro_compactor import MicroCompactor
from llm.chat_message import ChatMessage

logger = logging.getLogger(__name__)


class ContextCompactor:
    """分层上下文压缩器（Level 1 + 2 + 3 + 4）。

    特性：
    - LRU 缓存：限制 _micro_cache 最大容量，避免内存泄漏
    - 角色判别：仅依赖 message.role 判断工具结果，避免误判
    - 异步摘要支持：auto_compact 可配置为异步执行
    """

    # 最大缓存容量（防止内存泄漏）
    MAX_MICRO_CACHE_SIZE = 100
    # 摘要超时时间（秒），超时后跳过摘要继续流程
    SUMMARIZE_TIMEOUT_SECONDS = 30.0

    def __init__(
        self,
        *,
        enable_snip: bool,
        enable_microcompact: bool,
        enable_context_collapse: bool,
        enable_autocompact: bool,
        snip_keep_last: int,
        micro_replace_before_rounds: int,
        collapse_keep_last: int,
        auto_trigger_tokens: int,
        auto_keep_last: int,
    ) -> None:
        self._enable_snip = enable_snip
        self._enable_microcompact = enable_microcompact
        self._enable_context_collapse = enable_context_collapse
        self._enable_autocompact = enable_autocompact
        self._snip_keep_last = max(snip_keep_last, 1)
        self._micro_replace_before_rounds = max(micro_replace_before_rounds, 1)
        self._collapse_keep_last = max(collapse_keep_last, 1)
        self._auto_trigger_tokens = max(auto_trigger_tokens, 1)
        self._auto_keep_last = max(auto_keep_last, 1)

        self._micro_compactor = MicroCompactor(self.MAX_MICRO_CACHE_SIZE)

    async def compact_for_model(
        self,
        messages: list[ChatMessage],
        *,
        session_id: int | None,
        summarize_fn: Callable[[str], Awaitable[str]] | None = None,
        persist_transcript_fn: Callable[[int | None, list[ChatMessage]], str] | None = None,
    ) -> tuple[list[ChatMessage], dict[str, int | bool | str]]:
        before_tokens = self._estimate_tokens(messages)
        projected = list(messages)
        micro_replaced = 0
        auto_compacted = False
        transcript_path = ""

        if self._enable_snip:
            projected = self._apply_keep_last(projected, self._snip_keep_last)

        if self._enable_microcompact:
            projected, micro_replaced = self._apply_microcompact(
                projected,
                replace_before_rounds=self._micro_replace_before_rounds,
            )

        if self._enable_context_collapse:
            projected = self._apply_keep_last(projected, self._collapse_keep_last)

        after_level3_tokens = self._estimate_tokens(projected)
        if self._enable_autocompact and after_level3_tokens >= self._auto_trigger_tokens and summarize_fn is not None:
            if persist_transcript_fn is not None:
                transcript_path = persist_transcript_fn(session_id, projected)
            transcript_text = self._to_transcript_text(projected)

            # 🚀 优化5: 添加摘要超时保护，避免阻塞用户请求
            summary = ""
            try:
                summary = await asyncio.wait_for(
                    summarize_fn(transcript_text),
                    timeout=self.SUMMARIZE_TIMEOUT_SECONDS,
                )
                summary = summary.strip()
            except asyncio.TimeoutError:
                logger.warning(
                    "autocompact_summarize_timeout session_id=%s timeout=%.1f",
                    session_id,
                    self.SUMMARIZE_TIMEOUT_SECONDS,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("autocompact_summarize_failed session_id=%s err=%s", session_id, exc)

            if summary:
                projected = self._apply_autocompact(projected, summary, self._auto_keep_last)
                auto_compacted = True

        after_tokens = self._estimate_tokens(projected)
        released = max(before_tokens - after_tokens, 0)
        return projected, {
            "snip_enabled": self._enable_snip,
            "micro_enabled": self._enable_microcompact,
            "collapse_enabled": self._enable_context_collapse,
            "auto_enabled": self._enable_autocompact,
            "tokens_before": before_tokens,
            "tokens_after": after_tokens,
            "tokens_released": released,
            "micro_replaced_count": micro_replaced,
            "auto_compacted": auto_compacted,
            "transcript_path": transcript_path,
        }

    @staticmethod
    def _estimate_tokens(messages: list[ChatMessage]) -> int:
        return estimate_tokens(messages)

    @staticmethod
    def _apply_keep_last(messages: list[ChatMessage], keep_last_non_system: int) -> list[ChatMessage]:
        return apply_keep_last(messages, keep_last_non_system)

    def _apply_microcompact(
        self,
        messages: list[ChatMessage],
        *,
        replace_before_rounds: int,
    ) -> tuple[list[ChatMessage], int]:
        return self._micro_compactor.compact(
            messages,
            replace_before_rounds=replace_before_rounds,
        )

    @staticmethod
    def _to_transcript_text(messages: list[ChatMessage]) -> str:
        return to_transcript_text(messages)

    @staticmethod
    def _apply_autocompact(messages: list[ChatMessage], summary: str, keep_last_non_system: int) -> list[ChatMessage]:
        return apply_autocompact(messages, summary, keep_last_non_system)
