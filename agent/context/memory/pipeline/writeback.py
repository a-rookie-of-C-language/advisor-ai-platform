from __future__ import annotations

import inspect
import logging
import re
import time
from typing import Awaitable, Callable

from context.memory.core.governance import MemoryGovernance
from context.memory.core.schema import MemoryCandidate, WritebackResult

logger = logging.getLogger(__name__)

Extractor = Callable[[str, str], list[MemoryCandidate] | Awaitable[list[MemoryCandidate]]]


class MemoryWriteback:
    def __init__(self, governance: MemoryGovernance | None = None) -> None:
        self._governance = governance or MemoryGovernance()

    async def extract_candidates(
        self,
        user_text: str,
        assistant_text: str,
        source_turn_id: str | None = None,
        llm_extractor: Extractor | None = None,
    ) -> list[MemoryCandidate]:
        candidates = self._extract_rule_candidates(user_text, assistant_text, source_turn_id)

        if self._governance.llm_extract_enabled and llm_extractor is not None:
            llm_candidates = llm_extractor(user_text, assistant_text)
            if inspect.isawaitable(llm_candidates):
                llm_candidates = await llm_candidates
            for candidate in llm_candidates:
                normalized = MemoryCandidate(
                    content=candidate.content,
                    confidence=candidate.confidence,
                    source_turn_id=candidate.source_turn_id or source_turn_id,
                    tags={**candidate.tags, "source": candidate.tags.get("source", "llm")},
                )
                candidates.append(normalized)

        candidates = [candidate for candidate in candidates if self._governance.should_write_candidate(candidate)]
        return self._governance.deduplicate(candidates)

    async def flush(
        self,
        api_client,
        user_id: int,
        kb_id: int,
        candidates: list[MemoryCandidate],
    ) -> WritebackResult:
        t0 = time.monotonic()
        filtered = [candidate for candidate in candidates if self._governance.should_write_candidate(candidate)]
        if not filtered:
            logger.debug("Writeback skipped (no candidates): user=%d kb=%d", user_id, kb_id)
            return WritebackResult(accepted=0, rejected=0, message="no_candidates")
        result = await api_client.upsert_candidates(user_id=user_id, kb_id=kb_id, candidates=filtered)
        elapsed_ms = (time.monotonic() - t0) * 1000
        logger.debug(
            "Writeback done: user=%d kb=%d candidates=%d accepted=%d rejected=%d elapsed_ms=%.1f",
            user_id, kb_id, len(filtered), result.accepted, result.rejected, elapsed_ms
        )
        return result

    def _extract_rule_candidates(
        self,
        user_text: str,
        assistant_text: str,
        source_turn_id: str | None,
    ) -> list[MemoryCandidate]:
        candidates: list[MemoryCandidate] = []

        for sentence in self._split_sentences(user_text):
            confidence = self._estimate_confidence(sentence)
            if confidence <= 0:
                continue
            candidates.append(
                MemoryCandidate(
                    content=sentence,
                    confidence=confidence,
                    source_turn_id=source_turn_id,
                    tags={"source": "rule_user"},
                )
            )

        for sentence in self._split_sentences(assistant_text):
            lowered = sentence.lower()
            is_memory_sentence = (
                lowered.startswith("user")
                or lowered.startswith("preference")
                or lowered.startswith("constraint")
                or lowered.startswith("goal")
                or lowered.startswith("identity")
                or "remember" in lowered
                or "record" in lowered
            )
            if not is_memory_sentence:
                continue
            candidates.append(
                MemoryCandidate(
                    content=sentence,
                    confidence=0.70,
                    source_turn_id=source_turn_id,
                    tags={"source": "rule_assistant"},
                )
            )

        return candidates

    @staticmethod
    def _split_sentences(text: str) -> list[str]:
        chunks = re.split(r"[.!?\n]", text)
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    @staticmethod
    def _estimate_confidence(sentence: str) -> float:
        lowered = sentence.lower()
        strong_patterns = [
            "i like", "i dislike", "i prefer", "i am", "i work",
            "my preference", "must", "cannot", "remember", "long term",
        ]
        weak_patterns = [
            "i want", "please", "usually", "often",
        ]

        for pattern in strong_patterns:
            if pattern in lowered:
                return 0.8
        for pattern in weak_patterns:
            if pattern in lowered:
                return 0.65

        if len(sentence) >= 18:
            return 0.65
        return 0.0