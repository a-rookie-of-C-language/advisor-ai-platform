from __future__ import annotations

import json
import logging
import os
from typing import AsyncIterator, Awaitable, Callable, Iterable

from graph.runner import GraphRunner
from llm.base_provider import BaseLLMProvider, ChatMessage
from memory.core.schema import MemoryCandidate
from memory.pipeline.orchestrator import MemoryOrchestrator
from memory.pipeline.work_memory import WorkMemory
from tools.tool_assembly_pool import ToolAssemblyPool
from tools.tool_permission import PermissionConfig
from tools.tool_registry import ToolRegistry

_ALLOWED_ROLES = {"system", "user", "assistant"}
Extractor = Callable[[str, str], list[MemoryCandidate] | Awaitable[list[MemoryCandidate]]]
logger = logging.getLogger(__name__)

_STREAM_ERROR_MESSAGE = "服务内部错误，请稍后重试"


class ChatStreamService:
    def __init__(
        self,
        provider: BaseLLMProvider,
        memory_orchestrator: MemoryOrchestrator | None = None,
        llm_extractor: Extractor | None = None,
        rag_service=None,
    ) -> None:
        self._provider = provider
        self._memory_orchestrator = memory_orchestrator
        self._work_memory = WorkMemory()
        self._llm_extractor = llm_extractor
        self._debug_stream = self._read_debug_stream()
        self._enable_tool_use = self._read_enable_tool_use()
        self._use_langgraph = self._read_use_langgraph()
        self._enabled_tools = self._read_enabled_tools()
        self._tools = ToolRegistry(enabled_tools=self._enabled_tools)
        self._tool_permission = PermissionConfig.chat_tools()
        memory_client = getattr(self._memory_orchestrator, "api_client", None)
        for tool in ToolAssemblyPool.build(
            rag_service=rag_service,
            memory_client=memory_client,
        ):
            self._tools.register(tool)
        self._graph_runner = GraphRunner(
            provider=self._provider,
            memory_orchestrator=self._memory_orchestrator,
            llm_extractor=self._llm_extractor,
            tools=self._tools,
            tool_permission=self._tool_permission,
            debug_stream=self._debug_stream,
            enable_tool_use=self._enable_tool_use,
        )

    @staticmethod
    def _read_debug_stream() -> bool:
        raw = os.getenv("DEBUG_STREAM", "").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_enable_tool_use() -> bool:
        raw = os.getenv("ENABLE_TOOL_USE", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_use_langgraph() -> bool:
        raw = os.getenv("USE_LANGGRAPH", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_enabled_tools() -> set[str] | None:
        raw = os.getenv("ENABLED_TOOLS", "").strip()
        if not raw:
            return None
        names = {name.strip() for name in raw.split(",") if name.strip()}
        return names or None

    @staticmethod
    def _serialize_event(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    @staticmethod
    def _validate_messages(messages: Iterable[ChatMessage]) -> list[ChatMessage]:
        validated = []
        for message in messages:
            role = message.role.strip().lower()
            content = message.content.strip()
            if role not in _ALLOWED_ROLES:
                raise ValueError(f"Unsupported role: {message.role}")
            if not content:
                raise ValueError("Message content cannot be empty")
            validated.append(ChatMessage(role=role, content=content))

        if not validated:
            raise ValueError("messages cannot be empty")
        return validated

    @staticmethod
    def _to_memory_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
        return [{"role": item.role, "content": item.content} for item in messages]

    @staticmethod
    def _last_user_message(messages: list[ChatMessage]) -> str:
        for message in reversed(messages):
            if message.role == "user":
                return message.content
        return ""

    async def _execute_tool(
        self,
        tool_name: str,
        tool_args: dict,
        user_id: int | None,
        session_id: int | None,
        kb_id: int | None,
        user_query: str,
    ) -> str:
        context = {
            "user_id": user_id,
            "session_id": session_id,
            "kb_id": kb_id,
            "user_query": user_query,
            "permission_config": self._tool_permission,
        }
        try:
            return await self._tools.execute(tool_name, tool_args, context)
        except Exception:
            logger.exception(
                "Tool execute failed: tool=%s, user_id=%s, session_id=%s, kb_id=%s",
                tool_name,
                user_id,
                session_id,
                kb_id,
            )
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "tool_execute_failed",
                    "items": [],
                }
            )

    async def stream_events(
        self,
        messages: Iterable[ChatMessage],
        user_id: int | None = None,
        session_id: int | None = None,
        kb_id: int | None = None,
    ) -> AsyncIterator[str]:
        validated_messages = self._validate_messages(messages)
        if self._use_langgraph:
            async for event in self._stream_events_graph(
                validated_messages,
                user_id=user_id,
                session_id=session_id,
                kb_id=kb_id,
            ):
                yield event
            return

        async for event in self._stream_events_legacy(
            validated_messages,
            user_id=user_id,
            session_id=session_id,
            kb_id=kb_id,
        ):
            yield event

    async def _stream_events_graph(
        self,
        validated_messages: list[ChatMessage],
        *,
        user_id: int | None,
        session_id: int | None,
        kb_id: int | None,
    ) -> AsyncIterator[str]:
        user_query = self._last_user_message(validated_messages)
        yield self._serialize_event("start", {"message": "stream_started"})
        try:
            async for event in self._graph_runner.run_stream(
                messages=validated_messages,
                user_query=user_query,
                user_id=user_id,
                session_id=session_id,
                kb_id=kb_id,
            ):
                yield self._serialize_event(event["event"], event["data"])
            yield self._serialize_event("done", {"message": "stream_finished"})
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "Graph stream failed: user_id=%s, session_id=%s, kb_id=%s",
                user_id,
                session_id,
                kb_id,
            )
            if self._debug_stream:
                logger.warning("debug_stream python error(graph): error=%s", exc)
            try:
                yield self._serialize_event("error", {"message": _STREAM_ERROR_MESSAGE})
            except Exception as send_error_exc:  # noqa: BLE001
                logger.warning("Failed to send stream error event: %s", send_error_exc)
                return

            try:
                yield self._serialize_event("done", {"message": "stream_finished_with_error"})
            except Exception as send_done_exc:  # noqa: BLE001
                logger.warning("Failed to send stream done event after error: %s", send_done_exc)

    async def _stream_events_legacy(
        self,
        validated_messages: list[ChatMessage],
        *,
        user_id: int | None,
        session_id: int | None,
        kb_id: int | None,
    ) -> AsyncIterator[str]:
        model_messages = list(validated_messages)
        user_query = self._last_user_message(validated_messages)

        memory_enabled = (
            self._memory_orchestrator is not None
            and user_id is not None
            and session_id is not None
            and kb_id is not None
            and bool(user_query)
        )

        rag_enabled = bool(self._tools.specs()) and kb_id is not None and kb_id >= 0 and bool(user_query)

        if memory_enabled:
            try:
                context = await self._memory_orchestrator.load(
                    user_id=user_id,
                    session_id=session_id,
                    kb_id=kb_id,
                    query=user_query,
                    recent_messages=self._to_memory_messages(validated_messages),
                )
                memory_prompt = self._work_memory.render_for_prompt(context)
                if memory_prompt:
                    model_messages = [
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
                    "Memory load failed, degrade to no-memory mode: user_id=%s, session_id=%s, kb_id=%s, error=%s",
                    user_id,
                    session_id,
                    kb_id,
                    exc,
                )

        yield self._serialize_event("start", {"message": "stream_started"})

        answer_parts: list[str] = []
        debug_preview: list[str] = []
        debug_chars = 0
        debug_limit = 200
        debug_delta_count = 0
        try:
            if rag_enabled and self._enable_tool_use:
                tools = self._tools.specs()

                async def tool_executor(tool_name: str, tool_args: dict) -> str:
                    return await self._execute_tool(
                        tool_name=tool_name,
                        tool_args=tool_args,
                        user_id=user_id,
                        session_id=session_id,
                        kb_id=kb_id,
                        user_query=user_query,
                    )

                async for event in self._provider.stream_chat_with_tools(
                    model_messages,
                    tools,
                    tool_executor,
                    max_tool_calls=1,
                    max_tool_retries=3,
                ):
                    if event.type == "tool_result":
                        try:
                            payload = json.loads(event.tool_output) if event.tool_output else {}
                        except Exception:
                            payload = {}
                        yield self._serialize_event(
                            "sources",
                            {
                                "tool": event.tool_name,
                                "success": event.success,
                                "attempt": event.attempt,
                                "status": payload.get("status", "error"),
                                "message": payload.get("message", "tool execute failed"),
                                "items": payload.get("items", []),
                            },
                        )
                        continue

                    if event.type != "delta" or not event.text:
                        continue
                    delta = event.text
                    answer_parts.append(delta)
                    if self._debug_stream and debug_chars < debug_limit:
                        remain = debug_limit - debug_chars
                        piece = delta[:remain]
                        if piece:
                            debug_preview.append(piece)
                            debug_chars += len(piece)
                    if self._debug_stream:
                        debug_delta_count += 1
                    yield self._serialize_event("delta", {"text": delta})
            else:
                async for delta in self._provider.stream_chat(model_messages):
                    answer_parts.append(delta)
                    if self._debug_stream and debug_chars < debug_limit:
                        remain = debug_limit - debug_chars
                        piece = delta[:remain]
                        if piece:
                            debug_preview.append(piece)
                            debug_chars += len(piece)
                    if self._debug_stream:
                        debug_delta_count += 1
                    yield self._serialize_event("delta", {"text": delta})

            answer = "".join(answer_parts).strip()
            if self._debug_stream:
                logger.info(
                    "debug_stream python done: deltas=%s, answer_preview=%s",
                    debug_delta_count,
                    "".join(debug_preview),
                )
            if memory_enabled and answer:
                try:
                    await self._memory_orchestrator.flush(
                        user_id=user_id,
                        session_id=session_id,
                        kb_id=kb_id,
                        user_text=user_query,
                        assistant_text=answer,
                        recent_messages=self._to_memory_messages(validated_messages)
                        + [{"role": "assistant", "content": answer}],
                        llm_extractor=self._llm_extractor,
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Memory flush failed, skip writeback: %s", exc)

            yield self._serialize_event("done", {"message": "stream_finished"})
        except Exception as exc:
            logger.exception(
                "Legacy stream failed: user_id=%s, session_id=%s, kb_id=%s",
                user_id,
                session_id,
                kb_id,
            )
            if self._debug_stream:
                logger.warning(
                    "debug_stream python error: deltas=%s, answer_preview=%s, error=%s",
                    debug_delta_count,
                    "".join(debug_preview),
                    exc,
                )
            try:
                yield self._serialize_event("error", {"message": _STREAM_ERROR_MESSAGE})
            except Exception as send_error_exc: 
                logger.warning("Failed to send stream error event: %s", send_error_exc)
                return

            try:
                yield self._serialize_event("done", {"message": "stream_finished_with_error"})
            except Exception as send_done_exc: 
                logger.warning("Failed to send stream done event after error: %s", send_done_exc)

    def get_graph_health(self) -> dict:
        return {
            "use_langgraph": self._use_langgraph,
            "enable_tool_use": self._enable_tool_use,
            "debug_stream": self._debug_stream,
            "enabled_tools": sorted(self._enabled_tools) if self._enabled_tools else [],
            "registered_tools": [spec.name for spec in self._tools.specs()],
            "memory_enabled": self._memory_orchestrator is not None,
            "llm_extractor_enabled": self._llm_extractor is not None,
            "graph": self._graph_runner.health_snapshot(),
        }
