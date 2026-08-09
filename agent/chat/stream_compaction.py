from __future__ import annotations

import logging
import time

from chat.stream_runtime_config import ChatStreamRuntimeConfig
from context.compaction.ContextCompactionSubAgent import ContextCompactionSubAgent
from context.compaction.ContextCompactor import ContextCompactor
from context.compaction.TranscriptStore import TranscriptStore
from llm.chat_message import ChatMessage

logger = logging.getLogger(__name__)


class ChatStreamCompactionSupport:
    def __init__(
        self,
        *,
        config: ChatStreamRuntimeConfig,
        subagent: ContextCompactionSubAgent,
    ) -> None:
        self._compactor = ContextCompactor(
            enable_snip=config.context_snip_enabled,
            enable_microcompact=config.context_micro_enabled,
            enable_context_collapse=config.context_collapse_enabled,
            enable_autocompact=config.context_auto_enabled,
            snip_keep_last=config.context_snip_keep_last,
            micro_replace_before_rounds=config.context_micro_replace_before_rounds,
            collapse_keep_last=config.context_collapse_keep_last,
            auto_trigger_tokens=config.context_auto_trigger_tokens,
            auto_keep_last=config.context_auto_keep_last,
        )
        self._subagent = subagent
        self._transcript_store = TranscriptStore(config.context_transcript_dir)
        self._last_stats: dict[str, int | bool | str] = {
            "snip_enabled": config.context_snip_enabled,
            "micro_enabled": config.context_micro_enabled,
            "collapse_enabled": config.context_collapse_enabled,
            "auto_enabled": config.context_auto_enabled,
            "tokens_before": 0,
            "tokens_after": 0,
            "tokens_released": 0,
            "micro_replaced_count": 0,
            "auto_compacted": False,
            "transcript_path": "",
            "latency_ms": 0,
        }

    @property
    def last_stats(self) -> dict[str, int | bool | str]:
        return self._last_stats

    async def compact(
        self,
        messages: list[ChatMessage],
        *,
        session_id: int | None,
    ) -> tuple[list[ChatMessage], dict[str, int | bool | str]]:
        compact_started = time.monotonic()
        compacted_messages, compact_stats = await self._compactor.compact_for_model(
            messages,
            session_id=session_id,
            summarize_fn=self._summarize_for_autocompact,
            persist_transcript_fn=self._persist_compaction_transcript,
        )
        compact_stats["latency_ms"] = int((time.monotonic() - compact_started) * 1000)
        self._last_stats = compact_stats
        return compacted_messages, compact_stats

    async def _summarize_for_autocompact(self, transcript: str) -> str:
        try:
            return await self._subagent.summarize_transcript(transcript)
        except Exception as exc:  # noqa: BLE001
            logger.warning("autocompact_summarize_failed err=%s", exc)
            return ""

    def _persist_compaction_transcript(self, session_id: int | None, messages: list[ChatMessage]) -> str:
        try:
            return self._transcript_store.save(session_id, messages)
        except Exception as exc:  # noqa: BLE001
            logger.warning("autocompact_persist_failed session=%s err=%s", session_id, exc)
            return ""
