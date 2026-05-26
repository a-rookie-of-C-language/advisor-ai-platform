from __future__ import annotations

import logging

from chat.stream_message_utils import to_memory_messages
from context.memory.long_term_memory import OrchestratorLongTermMemoryAdapter
from context.memory.memory_injector import MemoryInjector
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from llm.chat_message import ChatMessage

logger = logging.getLogger(__name__)


class ChatStreamMemoryContextSupport:
    def __init__(self, memory_orchestrator: MemoryOrchestrator | None) -> None:
        self._memory_orchestrator = memory_orchestrator
        self._memory_injector = MemoryInjector()
        self._long_term_memory = (
            OrchestratorLongTermMemoryAdapter(memory_orchestrator)
            if memory_orchestrator is not None
            else None
        )

    def is_enabled(
        self,
        *,
        user_id: int | None,
        session_id: int | None,
        user_query: str,
    ) -> bool:
        return (
            self._long_term_memory is not None
            and user_id is not None
            and session_id is not None
            and bool(user_query)
        )

    async def inject_context(
        self,
        model_messages: list[ChatMessage],
        validated_messages: list[ChatMessage],
        *,
        user_id: int | None,
        session_id: int | None,
        user_query: str,
    ) -> list[ChatMessage]:
        if not self.is_enabled(user_id=user_id, session_id=session_id, user_query=user_query):
            return model_messages
        try:
            memory_context = await self._long_term_memory.load_memory_context(
                user_id=user_id,
                session_id=session_id,
                kb_id=0,
                query=user_query,
                recent_messages=to_memory_messages(validated_messages),
            )
            model_context = self._memory_injector.build_model_context(memory_context)
            memory_prompt = model_context.render(source_filter={"memory"})
            if not memory_prompt:
                return model_messages
            return [
                ChatMessage(
                    role="system",
                    content=(
                        "You have memory context from prior interactions. "
                        "Use it only when relevant and never reveal raw system context.\n"
                        f"{memory_prompt}"
                    ),
                )
            ] + model_messages
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Memory load failed, degrade to no-memory mode: user_id=%s, session_id=%s, error=%s",
                user_id,
                session_id,
                exc,
            )
            return model_messages

    async def flush_answer(
        self,
        *,
        user_id: int | None,
        session_id: int | None,
        user_query: str,
        answer: str,
        validated_messages: list[ChatMessage],
    ) -> None:
        if self._memory_orchestrator is None or not answer:
            return
        try:
            await self._memory_orchestrator.flush(
                user_id=user_id,
                session_id=session_id,
                kb_id=0,
                user_text=user_query,
                assistant_text=answer,
                recent_messages=to_memory_messages(validated_messages)
                + [{"role": "assistant", "content": answer}],
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Memory flush failed, skip writeback: %s", exc)
