from __future__ import annotations

import re

from memory.core.governance import MemoryGovernance
from memory.core.schema import MemoryCandidate, WritebackResult


class MemoryWriteback:
    def __init__(self, governance: MemoryGovernance | None = None) -> None:
        self._governance = governance or MemoryGovernance()

    def extract_candidates(
        self,
        user_text: str,
        assistant_text: str,
        source_turn_id: str | None = None,
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
                    tags={"source": "user"},
                )
            )

        for sentence in self._split_sentences(assistant_text):
            if not sentence.startswith("user"):
                continue
            candidates.append(
                MemoryCandidate(
                    content=sentence,
                    confidence=0.7,
                    source_turn_id=source_turn_id,
                    tags={"source": "assistant_summary"},
                )
            )

        candidates = [candidate for candidate in candidates if self._governance.should_write_candidate(candidate)]
        return self._governance.deduplicate(candidates)

    async def flush(
        self,
        api_client,
        user_id: int,
        kb_id: int,
        candidates: list[MemoryCandidate],
    ) -> WritebackResult:
        filtered = [candidate for candidate in candidates if self._governance.should_write_candidate(candidate)]
        if not filtered:
            return WritebackResult(accepted=0, rejected=0, message="no_candidates")
        return await api_client.upsert_candidates(user_id=user_id, kb_id=kb_id, candidates=filtered)

    @staticmethod
    def _split_sentences(text: str) -> list[str]:
        chunks = re.split(r"[.!?\n]", text)
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    @staticmethod
    def _estimate_confidence(sentence: str) -> float:
        keywords = ["i like", "i dislike", "i prefer", "i am", "i work", "my preference", "remember"]
        lowered = sentence.lower()
        for keyword in keywords:
            if keyword in lowered:
                return 0.8
        if len(sentence) >= 12:
            return 0.65
        return 0.0
