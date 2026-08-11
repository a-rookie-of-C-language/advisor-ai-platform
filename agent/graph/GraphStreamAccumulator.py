from __future__ import annotations

from collections.abc import Awaitable, Callable

from json_types import JsonObject
from safety.safety_pipeline import SafetyPipeline
from safety.StreamingRegexFilter import StreamingRegexFilter


class GraphStreamAccumulator:
    def __init__(
        self,
        *,
        safety_pipeline: SafetyPipeline | None,
        debug_stream: bool,
        emit: Callable[[str, JsonObject], Awaitable[None]],
        debug_preview_limit: int = 200,
    ) -> None:
        self._safety_pipeline = safety_pipeline
        self._debug_stream = debug_stream
        self._emit = emit
        self._debug_preview_limit = debug_preview_limit
        self._answer_parts: list[str] = []
        self._debug_preview_parts: list[str] = []
        self._debug_chars = 0
        self._debug_count = 0
        self._llm_chunk_count = 0
        self._safety_regex_matches = 0
        self._streaming_filter: StreamingRegexFilter | None = (
            safety_pipeline.create_streaming_filter() if safety_pipeline is not None else None
        )

    @property
    def llm_chunk_count(self) -> int:
        return self._llm_chunk_count

    @property
    def answer(self) -> str:
        return "".join(self._answer_parts).strip()

    def add_sensitive_count(self, count: int) -> None:
        self._safety_regex_matches += count

    async def append_delta(self, delta: str) -> None:
        self._llm_chunk_count += 1
        await self._append_output_delta(delta)
        self._append_debug_preview(delta)
        if self._debug_stream:
            self._debug_count += 1

    async def flush(self) -> None:
        if self._streaming_filter is None:
            return
        flushed = self._streaming_filter.flush()
        if not flushed:
            return
        self._answer_parts.append(flushed)
        self._safety_regex_matches += len(self._streaming_filter._filter.scan(flushed))
        await self._emit("llm_delta", {"text": flushed})

    async def final_answer(self) -> str:
        raw_answer = self.answer
        if not raw_answer or self._safety_pipeline is None:
            return raw_answer
        safety_result = self._safety_pipeline.filter_text(raw_answer)
        final_answer = safety_result.redacted if safety_result.has_sensitive else raw_answer
        total_regex_matches = self._safety_regex_matches + len(safety_result.regex_matches)
        total_privacy_spans = len(safety_result.privacy_result.spans) if safety_result.privacy_result else 0
        if total_regex_matches > 0 or total_privacy_spans > 0:
            await self._emit(
                "safety_warning",
                {
                    "regex_matches": total_regex_matches,
                    "privacy_spans": total_privacy_spans,
                },
            )
        return final_answer

    def state(self, *, assistant_answer: str, stream_failed: bool) -> JsonObject:
        return {
            "assistant_answer": assistant_answer,
            "stream_failed": stream_failed,
            "debug_delta_count": self._debug_count,
            "debug_preview": "".join(self._debug_preview_parts),
            "llm_chunk_count": self._llm_chunk_count,
        }

    async def _append_output_delta(self, delta: str) -> None:
        if self._streaming_filter is None:
            self._answer_parts.append(delta)
            await self._emit("llm_delta", {"text": delta})
            return

        filtered_delta = self._streaming_filter.process_chunk(delta)
        if not filtered_delta:
            return
        self._answer_parts.append(filtered_delta)
        await self._emit("llm_delta", {"text": filtered_delta})
        self._safety_regex_matches += len(self._streaming_filter._filter.scan(filtered_delta))

    def _append_debug_preview(self, delta: str) -> None:
        if not self._debug_stream or self._debug_chars >= self._debug_preview_limit:
            return
        remain = self._debug_preview_limit - self._debug_chars
        piece = delta[:remain]
        if not piece:
            return
        self._debug_preview_parts.append(piece)
        self._debug_chars += len(piece)
