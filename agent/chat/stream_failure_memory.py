from __future__ import annotations

import logging
import time

from eval.action_score import score_action
from json_types import JsonObject
from llm.chat_message import ChatMessage
from memory.failure_memory_matcher import FailureMemoryMatcher
from memory.failure_memory_store import FailureMemoryStore
from memory.FailureMemoryItem import FailureMemoryItem
from prompt.PromptBuilder import PromptBuilder

logger = logging.getLogger(__name__)


class ChatStreamFailureMemorySupport:
    def __init__(
        self,
        *,
        store: FailureMemoryStore,
        action_score_threshold: int,
    ) -> None:
        self._store = store
        self._action_score_threshold = action_score_threshold

    def inject_avoidance_prompt(
        self,
        messages: list[ChatMessage],
        *,
        user_query: str,
    ) -> list[ChatMessage]:
        if not user_query:
            return messages
        recent = self._store.load_recent(limit=200)
        matched = FailureMemoryMatcher.match(user_query, recent)
        if not matched:
            return messages
        prompt = PromptBuilder.build_failure_avoid_prompt(matched)
        if not prompt:
            return messages
        return PromptBuilder.assemble_messages(messages, dynamic_prompts=[prompt])

    def evaluate_trace_and_record(
        self,
        *,
        user_query: str,
        trace_events: list[JsonObject],
        session_id: int | None,
        user_id: int | None,
    ) -> JsonObject:
        action_score = score_action(user_query=user_query, trace_events=trace_events)
        action_score_dict = action_score.to_dict()
        logger.info(
            "action_score session_id=%s user_id=%s score=%s detail=%s",
            session_id,
            user_id,
            action_score.total,
            action_score_dict,
        )
        if action_score.total < self._action_score_threshold:
            logger.warning(
                "action_score_below_threshold session_id=%s user_id=%s score=%s threshold=%s",
                session_id,
                user_id,
                action_score.total,
                self._action_score_threshold,
            )
            self.write_failure_memory(
                user_query=user_query,
                session_id=session_id,
                score=action_score.total,
                reasons=action_score.reasons,
            )
        return action_score_dict

    def write_failure_memory(
        self,
        *,
        user_query: str,
        session_id: int | None,
        score: int,
        reasons: list[str],
    ) -> None:
        if not reasons:
            return
        avoid_strategy = "Prefer explicit tool decision, validate tool args, and ground answer on tool evidence."
        item = FailureMemoryItem(
            ts=str(int(time.time())),
            user_query=user_query,
            session_id=session_id,
            kb_id=None,
            reasons=reasons,
            score=score,
            avoid_strategy=avoid_strategy,
        )
        self._store.append(item)
