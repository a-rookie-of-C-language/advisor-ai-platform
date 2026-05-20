from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from collections import OrderedDict
from typing import Awaitable, Callable

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

        # 🚀 优化1: 使用 LRU 有序字典替代普通 dict，避免内存泄漏
        self._micro_cache: OrderedDict[str, str] = OrderedDict()

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
        if (
            self._enable_autocompact
            and after_level3_tokens >= self._auto_trigger_tokens
            and summarize_fn is not None
        ):
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

    def _apply_microcompact(
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
        cached = self._micro_cache.get(key)
        if cached is not None:
            # 🚀 优化2: LRU 更新，将访问的 key 移到末尾
            self._micro_cache.move_to_end(key)
            return cached

        tool_name = self._extract_tool_name(content)
        replaced = f"[Previous: used {tool_name}]"

        # 🚀 优化3: LRU 淘汰，超过容量后移除最旧的
        if len(self._micro_cache) >= self.MAX_MICRO_CACHE_SIZE:
            self._micro_cache.popitem(last=False)

        self._micro_cache[key] = replaced
        return replaced

    @staticmethod
    def _extract_tool_name(content: str) -> str:
        """从工具返回内容中提取工具名称"""
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
        # 🚀 优化4: 仅依赖 role 判断，避免误判 JSON 代码示例
        return message.role == "tool"

    @staticmethod
    def _to_transcript_text(messages: list[ChatMessage]) -> str:
        lines: list[str] = []
        for message in messages:
            lines.append(f"{message.role}: {message.content}")
        return "\n".join(lines).strip()

    @staticmethod
    def _apply_autocompact(messages: list[ChatMessage], summary: str, keep_last_non_system: int) -> list[ChatMessage]:
        non_system = [message for message in messages if message.role != "system"]
        tail = non_system[-keep_last_non_system:]
        summary_message = ChatMessage(
            role="system",
            content="Context summary (autocompact):\n" + summary,
        )
        return [summary_message] + tail