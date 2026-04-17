from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncIterator, Awaitable, Callable, Iterable

from llm.base_provider import BaseLLMProvider, ChatMessage, LLMStreamEvent, ToolSpec
from memory.core.schema import MemoryCandidate
from memory.pipeline.orchestrator import MemoryOrchestrator
from memory.pipeline.work_memory import WorkMemory

from RAG.RAG_service import RAG_service
from RAG.schema import RAGSearchRequest, SearchMode

_ALLOWED_ROLES = {"system", "user", "assistant"}
Extractor = Callable[[str, str], list[MemoryCandidate] | Awaitable[list[MemoryCandidate]]]
logger = logging.getLogger(__name__)


class ChatStreamService:
    def __init__(
        self,
        provider: BaseLLMProvider,
        memory_orchestrator: MemoryOrchestrator | None = None,
        llm_extractor: Extractor | None = None,
        rag_service: RAG_service | None = None,
    ) -> None:
        self._provider = provider
        self._memory_orchestrator = memory_orchestrator
        self._work_memory = WorkMemory()
        self._llm_extractor = llm_extractor
        self._rag_service = rag_service
        self._debug_stream = self._read_debug_stream()
        self._enable_tool_use = self._read_enable_tool_use()

    @staticmethod
    def _read_debug_stream() -> bool:
        raw = os.getenv("DEBUG_STREAM", "").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_enable_tool_use() -> bool:
        raw = os.getenv("ENABLE_TOOL_USE", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

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

    async def _run_rag_tool(
        self,
        user_query: str,
        kb_id: int,
        top_k: int,
        max_retries: int,
    ) -> str:
        if self._rag_service is None:
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "RAG service unavailable",
                    "items": [],
                },
                ensure_ascii=False,
            )

        for attempt in range(1, max_retries + 1):
            try:
                req = RAGSearchRequest(
                    query=user_query,
                    kb_id=kb_id,
                    top_k=top_k,
                    mode=SearchMode.dense,
                    use_rerank=True,
                )
                result = self._rag_service.rag_search(req)
                if result.ok and result.items:
                    items = [
                        {
                            "id": hit.doc_id,
                            "docName": hit.doc_title,
                            "snippet": hit.text[:200],
                            "score": hit.score,
                        }
                        for hit in result.items
                    ]
                    return json.dumps(
                        {
                            "ok": True,
                            "status": "hit",
                            "message": "命中",
                            "attempt": attempt,
                            "items": items,
                        },
                        ensure_ascii=False,
                    )

                if result.ok:
                    return json.dumps(
                        {
                            "ok": True,
                            "status": "miss",
                            "message": "未命中",
                            "attempt": attempt,
                            "items": [],
                        },
                        ensure_ascii=False,
                    )

                return json.dumps(
                    {
                        "ok": False,
                        "status": "error",
                        "message": "RAG 检索失败",
                        "attempt": attempt,
                        "items": [],
                    },
                    ensure_ascii=False,
                )
            except Exception as exc:  # noqa: BLE001
                if attempt >= max_retries:
                    return json.dumps(
                        {
                            "ok": False,
                            "status": "error",
                            "message": f"RAG 异常: {exc}",
                            "attempt": attempt,
                            "items": [],
                        },
                        ensure_ascii=False,
                    )
                logger.warning("RAG tool execute failed, retry=%s/%s, error=%s", attempt, max_retries, exc)

        return json.dumps(
            {
                "ok": False,
                "status": "error",
                "message": "RAG 检索失败",
                "items": [],
            },
            ensure_ascii=False,
        )

    async def _execute_tool(self, tool_name: str, tool_args: dict[str, Any], kb_id: int, user_query: str) -> str:
        if tool_name != "rag_search":
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": f"unsupported tool: {tool_name}",
                    "items": [],
                },
                ensure_ascii=False,
            )

        query = str(tool_args.get("query") or user_query).strip()
        top_k_raw = tool_args.get("top_k", 5)
        try:
            top_k = max(1, min(int(top_k_raw), 10))
        except Exception:
            top_k = 5
        return await self._run_rag_tool(query, kb_id, top_k, max_retries=3)

    async def stream_events(
        self,
        messages: Iterable[ChatMessage],
        user_id: int | None = None,
        session_id: int | None = None,
        kb_id: int | None = None,
    ) -> AsyncIterator[str]:
        validated_messages = self._validate_messages(messages)
        model_messages = list(validated_messages)
        user_query = self._last_user_message(validated_messages)

        memory_enabled = (
            self._memory_orchestrator is not None
            and user_id is not None
            and session_id is not None
            and kb_id is not None
            and bool(user_query)
        )

        rag_enabled = (
            self._rag_service is not None
            and kb_id is not None
            and kb_id > 0
            and bool(user_query)
        )

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
                tools = [
                    ToolSpec(
                        name="rag_search",
                        description="从知识库检索与用户问题相关的片段，返回来源和摘要。",
                        parameters={
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "用户问题"},
                                "top_k": {"type": "integer", "description": "返回条数，1-10", "default": 5},
                            },
                            "required": ["query"],
                        },
                    )
                ]

                async def tool_executor(tool_name: str, tool_args: dict[str, Any]) -> str:
                    safe_kb_id = kb_id if kb_id is not None else 0
                    return await self._execute_tool(tool_name, tool_args, safe_kb_id, user_query)

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
                                "message": payload.get("message", "未命中"),
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
        except Exception as exc:  # noqa: BLE001
            if self._debug_stream:
                logger.warning(
                    "debug_stream python error: deltas=%s, answer_preview=%s, error=%s",
                    debug_delta_count,
                    "".join(debug_preview),
                    exc,
                )
            try:
                yield self._serialize_event("error", {"message": str(exc)})
            except Exception as send_error_exc:  # noqa: BLE001
                logger.warning("Failed to send stream error event: %s", send_error_exc)
                return

            try:
                yield self._serialize_event("done", {"message": "stream_finished_with_error"})
            except Exception as send_done_exc:  # noqa: BLE001
                logger.warning("Failed to send stream done event after error: %s", send_done_exc)
