from __future__ import annotations

import inspect
import logging
import re
import time
from typing import Awaitable, Callable

from context.memory.core.governance import MemoryGovernance
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryDecision import DecisionType
from context.memory.core.WritebackResult import WritebackResult
from context.memory.pipeline.decision_engine import DecisionEngine

logger = logging.getLogger(__name__)

Extractor = Callable[[str, str], list[MemoryCandidate] | Awaitable[list[MemoryCandidate]]]


class MemoryWriteback:
    def __init__(
        self,
        governance: MemoryGovernance | None = None,
        decision_engine: DecisionEngine | None = None,
    ) -> None:
        self._governance = governance or MemoryGovernance()
        self._decision_engine = decision_engine or DecisionEngine()

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
                    memory_type=candidate.memory_type,
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
        # Basic content check (confidence filtering is now in DecisionEngine)
        filtered = [c for c in candidates if self._governance.should_write_candidate(c)]
        if not filtered:
            logger.debug("Writeback skipped (no candidates): user=%d kb=%d", user_id, kb_id)
            return WritebackResult(accepted=0, rejected=0, message="no_candidates")

        accepted = 0
        ignored = 0
        updated = 0
        merged = 0
        invalidated = 0

        for candidate in filtered:
            # Query similar memories for decision context
            similar_memories = await self._find_similar(api_client, user_id, kb_id, candidate)

            # Get decision from engine
            decision = await self._decision_engine.decide(candidate, similar_memories)

            # Execute decision
            await self._execute_decision(decision, candidate, api_client, user_id, kb_id)

            if decision.decision == DecisionType.IGNORE:
                ignored += 1
            elif decision.decision == DecisionType.ADD:
                accepted += 1
            elif decision.decision == DecisionType.UPDATE:
                updated += 1
                accepted += 1
            elif decision.decision == DecisionType.MERGE:
                merged += 1
                accepted += 1
            elif decision.decision == DecisionType.INVALIDATE:
                invalidated += 1
                accepted += 1

        elapsed_ms = (time.monotonic() - t0) * 1000
        logger.debug(
            "Writeback done: user=%d kb=%d total=%d accepted=%d ignored=%d "
            "updated=%d merged=%d invalidated=%d elapsed_ms=%.1f",
            user_id,
            kb_id,
            len(filtered),
            accepted,
            ignored,
            updated,
            merged,
            invalidated,
            elapsed_ms,
        )
        return WritebackResult(
            accepted=accepted,
            rejected=ignored,
            message=(
                f"add={accepted - updated - merged - invalidated}, update={updated}, "
                f"merge={merged}, invalidate={invalidated}, ignore={ignored}"
            ),
        )

    async def _find_similar(self, api_client, user_id: int, kb_id: int, candidate: MemoryCandidate):
        """Find similar memories for decision context."""
        try:
            items = await api_client.search_long_term(
                user_id=user_id,
                kb_id=kb_id,
                query=candidate.content,
                top_k=5,
            )
            # Filter by same memory_type for more relevant comparison
            same_type = [m for m in items if m.memory_type == candidate.memory_type]
            return same_type if same_type else items
        except Exception as e:
            logger.warning("Failed to find similar memories: %s", e)
            return []

    async def _execute_decision(
        self,
        decision,
        candidate: MemoryCandidate,
        api_client,
        user_id: int,
        kb_id: int,
    ) -> None:
        """Execute the decision by calling appropriate API."""
        try:
            if decision.decision == DecisionType.IGNORE:
                return

            if decision.decision == DecisionType.ADD:
                candidate.is_core = decision.is_core
                await api_client.upsert_candidates(user_id=user_id, kb_id=kb_id, candidates=[candidate])

            elif decision.decision == DecisionType.UPDATE:
                if decision.target_memory_id:
                    await api_client.update_memory_content(
                        decision.target_memory_id,
                        candidate.content,
                        candidate.confidence,
                    )

            elif decision.decision == DecisionType.MERGE:
                if decision.target_memory_id and decision.merged_content:
                    # Update target memory with merged content
                    await api_client.update_memory_content(
                        decision.target_memory_id,
                        decision.merged_content,
                        max(candidate.confidence, 0.8),
                    )
                    # Write new memory and mark as merged into target
                    await api_client.upsert_candidates(user_id=user_id, kb_id=kb_id, candidates=[candidate])
                    # Note: The new memory ID is not returned by upsert_candidates,
                    # so we rely on the target memory being updated with merged content

            elif decision.decision == DecisionType.INVALIDATE:
                # Support multi-target invalidation
                target_ids = decision.target_memory_ids or []
                if decision.target_memory_id and decision.target_memory_id not in target_ids:
                    target_ids.append(decision.target_memory_id)
                for old_id in target_ids:
                    await api_client.invalidate_memory(old_id)
                # Add the new memory
                await api_client.upsert_candidates(user_id=user_id, kb_id=kb_id, candidates=[candidate])

        except Exception as e:
            logger.warning("Failed to execute decision %s: %s", decision.decision.value, e)

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
            memory_type = self._infer_memory_type(sentence)
            candidates.append(
                MemoryCandidate(
                    content=sentence,
                    confidence=confidence,
                    source_turn_id=source_turn_id,
                    tags={"source": "rule_user"},
                    memory_type=memory_type,
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
            memory_type = self._infer_memory_type(sentence)
            candidates.append(
                MemoryCandidate(
                    content=sentence,
                    confidence=0.70,
                    source_turn_id=source_turn_id,
                    tags={"source": "rule_assistant"},
                    memory_type=memory_type,
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
            "i like",
            "i dislike",
            "i prefer",
            "i am",
            "i work",
            "my preference",
            "must",
            "cannot",
            "remember",
            "long term",
        ]
        weak_patterns = [
            "i want",
            "please",
            "usually",
            "often",
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

    @staticmethod
    def _infer_memory_type(sentence: str) -> str:
        """Infer memory type from sentence content.

        Episodic indicators: past events, specific experiences, temporal references.
        Semantic indicators (default): facts, preferences, identity, goals.
        """
        lowered = sentence.lower()
        # Episodic markers: past tense references, specific events, temporal words
        episodic_markers = [
            "上次",
            "之前",
            "曾经",
            "那次",
            "昨天",
            "上周",
            "上个月",
            "去年",
            "前天",
            "那天",
            "那次",
            "当时",
            "后来",
            "last time",
            "previously",
            "once",
            "yesterday",
            "last week",
            "last month",
            "last year",
            "ago",
            "then",
            "after that",
        ]
        for marker in episodic_markers:
            if marker in lowered:
                return "episodic"
        return "semantic"
