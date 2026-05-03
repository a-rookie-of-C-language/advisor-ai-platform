from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import AsyncIterator, Awaitable, Callable, Iterable

from context.compaction.ContextCompactionSubAgent import ContextCompactionSubAgent
from context.compaction.ContextCompactor import ContextCompactor
from context.compaction.TranscriptStore import TranscriptStore
from context.memory.core.schema import MemoryCandidate
from context.memory.long_term_memory import OrchestratorLongTermMemoryAdapter
from context.memory.memory_injector import MemoryInjector
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from eval.action_score import score_action
from graph.runner import GraphRunner
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from memory.failure_memory_matcher import FailureMemoryMatcher
from memory.failure_memory_store import FailureMemoryItem, FailureMemoryStore
from prompt.QueryEngine import QueryEngine
from skills.presets import build_default_registry
from tools.tool_assembly_pool import ToolAssemblyPool
from tools.tool_permission import PermissionConfig, ToolPermission
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
        self._memory_injector = MemoryInjector()
        self._long_term_memory = (
            OrchestratorLongTermMemoryAdapter(memory_orchestrator)
            if memory_orchestrator is not None
            else None
        )
        self._llm_extractor = llm_extractor
        self._debug_stream = self._read_debug_stream()
        self._enable_tool_use = self._read_enable_tool_use()
        self._use_langgraph = self._read_use_langgraph()
        self._enabled_tools = self._read_enabled_tools()
        self._context_compactor = ContextCompactor(
            enable_snip=self._read_context_snip_enabled(),
            enable_microcompact=self._read_context_micro_enabled(),
            enable_context_collapse=self._read_context_collapse_enabled(),
            enable_autocompact=self._read_context_auto_enabled(),
            snip_keep_last=self._read_context_snip_keep_last(),
            micro_replace_before_rounds=self._read_context_micro_replace_before_rounds(),
            collapse_keep_last=self._read_context_collapse_keep_last(),
            auto_trigger_tokens=self._read_context_auto_trigger_tokens(),
            auto_keep_last=self._read_context_auto_keep_last(),
        )
        self._compaction_subagent = ContextCompactionSubAgent(self._provider)
        self._transcript_store = TranscriptStore(self._read_context_transcript_dir())
        self._tools = ToolRegistry(enabled_tools=self._enabled_tools)
        self._tool_permission = PermissionConfig.from_allowed_tools(
            {ToolPermission.RAG_READ, ToolPermission.MEMORY_READ,
             ToolPermission.MEMORY_WRITE, ToolPermission.SEARCH},
            read_resources={"context", "memory"},
            write_resources={"memory"},
        )
        self._feature_action_scoring = self._read_feature_action_scoring()
        self._feature_failure_memory_inject = self._read_feature_failure_memory_inject()
        self._action_score_threshold = self._read_action_score_threshold()
        self._failure_memory_store = FailureMemoryStore(self._read_failure_memory_dir())
        self._last_action_score: dict[str, object] = {}
        self._last_compaction_stats: dict[str, int | bool | str] = {
            "snip_enabled": self._read_context_snip_enabled(),
            "micro_enabled": self._read_context_micro_enabled(),
            "collapse_enabled": self._read_context_collapse_enabled(),
            "auto_enabled": self._read_context_auto_enabled(),
            "tokens_before": 0,
            "tokens_after": 0,
            "tokens_released": 0,
            "micro_replaced_count": 0,
            "auto_compacted": False,
            "transcript_path": "",
            "latency_ms": 0,
        }
        memory_client = getattr(self._memory_orchestrator, "api_client", None)
        for tool in ToolAssemblyPool.build(
            rag_service=rag_service,
            memory_client=memory_client,
        ):
            self._tools.register(tool)
        self._skill_registry = build_default_registry()
        self._graph_runner = GraphRunner(
            provider=self._provider,
            memory_orchestrator=self._memory_orchestrator,
            llm_extractor=self._llm_extractor,
            tools=self._tools,
            tool_permission=self._tool_permission,
            debug_stream=self._debug_stream,
            enable_tool_use=self._enable_tool_use,
            skill_registry=self._skill_registry,
        )


    @staticmethod
    def _read_feature_action_scoring() -> bool:
        raw = os.getenv("FEATURE_ACTION_SCORING", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_feature_failure_memory_inject() -> bool:
        raw = os.getenv("FEATURE_FAILURE_MEMORY_INJECT", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_action_score_threshold() -> int:
        raw = os.getenv("ACTION_SCORE_THRESHOLD", "70").strip()
        try:
            return max(min(int(raw), 100), 0)
        except ValueError:
            return 70

    @staticmethod
    def _read_failure_memory_dir() -> str:
        raw = os.getenv("FAILURE_MEMORY_DIR", "").strip()
        if raw:
            return raw
        return str(Path("runtime") / "failure_memory")

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
    def _read_context_snip_enabled() -> bool:
        raw = os.getenv("FEATURE_CONTEXT_SNIP", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_context_collapse_enabled() -> bool:
        raw = os.getenv("FEATURE_CONTEXT_COLLAPSE", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_context_micro_enabled() -> bool:
        raw = os.getenv("FEATURE_CONTEXT_MICROCOMPACT", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_context_auto_enabled() -> bool:
        raw = os.getenv("FEATURE_CONTEXT_AUTOCOMPACT", "true").strip().lower()
        return raw in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_context_snip_keep_last() -> int:
        raw = os.getenv("CONTEXT_SNIP_KEEP_LAST", "12").strip()
        try:
            return max(int(raw), 1)
        except ValueError:
            return 12

    @staticmethod
    def _read_context_collapse_keep_last() -> int:
        raw = os.getenv("CONTEXT_COLLAPSE_KEEP_LAST", "8").strip()
        try:
            return max(int(raw), 1)
        except ValueError:
            return 8

    @staticmethod
    def _read_context_micro_replace_before_rounds() -> int:
        raw = os.getenv("CONTEXT_MICRO_REPLACE_BEFORE_ROUNDS", "3").strip()
        try:
            return max(int(raw), 1)
        except ValueError:
            return 3

    @staticmethod
    def _read_context_auto_trigger_tokens() -> int:
        raw = os.getenv("CONTEXT_AUTO_TRIGGER_TOKENS", "70000").strip()
        try:
            return max(int(raw), 1)
        except ValueError:
            return 70000

    @staticmethod
    def _read_context_auto_keep_last() -> int:
        raw = os.getenv("CONTEXT_AUTO_KEEP_LAST", "4").strip()
        try:
            return max(int(raw), 1)
        except ValueError:
            return 4

    @staticmethod
    def _read_context_transcript_dir() -> str:
        raw = os.getenv("CONTEXT_TRANSCRIPT_DIR", "").strip()
        if raw:
            return raw
        return str(Path("runtime") / "transcripts")

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


    @staticmethod
    def _parse_serialized_event(raw: str) -> dict[str, object]:
        event_name = "message"
        data: dict[str, object] = {}
        for line in raw.strip().split("\n"):
            if line.startswith("event:"):
                event_name = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                payload = line.split(":", 1)[1].strip()
                try:
                    parsed = json.loads(payload)
                    if isinstance(parsed, dict):
                        data = parsed
                except json.JSONDecodeError:
                    data = {}
        return {"event": event_name, "data": data}

    def _build_failure_avoid_prompt(self, matched: dict[str, object]) -> str:
        return QueryEngine.build_failure_avoid_prompt(matched)

    def _write_failure_memory(
        self,
        *,
        user_query: str,
        session_id: int | None,
        kb_id: int | None,
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
            kb_id=kb_id,
            reasons=reasons,
            score=score,
            avoid_strategy=avoid_strategy,
        )
        self._failure_memory_store.append(item)

    async def _execute_tool(
        self,
        tool_name: str,
        tool_args: dict,
        user_id: int | None,
        session_id: int | None,
        kb_id: int | None,
        user_query: str,
        trace_id: str | None = None,
        turn_id: str | None = None,
    ) -> str:
        context = {
            "user_id": user_id,
            "session_id": session_id,
            "kb_id": kb_id,
            "user_query": user_query,
            "trace_id": trace_id,
            "turn_id": turn_id,
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
        trace_id: str | None = None,
        turn_id: str | None = None,
    ) -> AsyncIterator[str]:
        validated_messages = self._validate_messages(messages)
        user_query = self._last_user_message(validated_messages)
        if self._feature_failure_memory_inject and user_query:
            recent = self._failure_memory_store.load_recent(limit=200)
            matched = FailureMemoryMatcher.match(user_query, recent)
            if matched:
                prompt = self._build_failure_avoid_prompt(matched)
                if prompt:
                    validated_messages = QueryEngine.assemble_messages(validated_messages, dynamic_prompts=[prompt])

        compact_started = time.monotonic()
        compacted_messages, compact_stats = await self._context_compactor.compact_for_model(
            validated_messages,
            session_id=session_id,
            summarize_fn=self._summarize_for_autocompact,
            persist_transcript_fn=self._persist_compaction_transcript,
        )
        compact_stats["latency_ms"] = int((time.monotonic() - compact_started) * 1000)
        self._last_compaction_stats = compact_stats
        logger.info(
            "stream_events start: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, kb_id=%s",
            trace_id,
            turn_id,
            session_id,
            user_id,
            kb_id,
        )
        if compact_stats["tokens_released"] > 0:
            logger.info(
                "context_compaction_released session_id=%s released=%s before=%s after=%s",
                session_id,
                compact_stats["tokens_released"],
                compact_stats["tokens_before"],
                compact_stats["tokens_after"],
            )
        if compact_stats.get("auto_compacted"):
            logger.info(
                "context_autocompact_done session_id=%s transcript=%s",
                session_id,
                compact_stats.get("transcript_path", ""),
            )

        trace_events: list[dict[str, object]] = []
        if self._use_langgraph:
            async for event in self._stream_events_graph(
                validated_messages,
                user_id=user_id,
                session_id=session_id,
                kb_id=kb_id,
                trace_id=trace_id,
                turn_id=turn_id,
            ):
                trace_events.append(self._parse_serialized_event(event))
                yield event
        else:
            async for event in self._stream_events_legacy(
                compacted_messages,
                user_id=user_id,
                session_id=session_id,
                kb_id=kb_id,
            ):
                trace_events.append(self._parse_serialized_event(event))
                yield event

        if self._feature_action_scoring:
            action_score = score_action(user_query=user_query, kb_id=kb_id, trace_events=trace_events)
            self._last_action_score = action_score.to_dict()
            logger.info(
                "action_score session_id=%s user_id=%s score=%s detail=%s",
                session_id,
                user_id,
                action_score.total,
                action_score.to_dict(),
            )
            if action_score.total < self._action_score_threshold:
                logger.warning(
                    "action_score_below_threshold session_id=%s user_id=%s score=%s threshold=%s",
                    session_id,
                    user_id,
                    action_score.total,
                    self._action_score_threshold,
                )
                self._write_failure_memory(
                    user_query=user_query,
                    session_id=session_id,
                    kb_id=kb_id,
                    score=action_score.total,
                    reasons=action_score.reasons,
                )

    async def _stream_events_graph(
        self,
        validated_messages: list[ChatMessage],
        *,
        user_id: int | None,
        session_id: int | None,
        kb_id: int | None,
        trace_id: str | None,
        turn_id: str | None,
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
                trace_id=trace_id,
                turn_id=turn_id,
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
        trace_id: str | None,
        turn_id: str | None,
    ) -> AsyncIterator[str]:
        model_messages = list(validated_messages)
        user_query = self._last_user_message(validated_messages)

        memory_enabled = (
            self._long_term_memory is not None
            and user_id is not None
            and session_id is not None
            and kb_id is not None
            and bool(user_query)
        )

        rag_enabled = bool(self._tools.specs()) and kb_id is not None and kb_id >= 0 and bool(user_query)

        if memory_enabled:
            try:
                memory_context = await self._long_term_memory.load_memory_context(
                    user_id=user_id,
                    session_id=session_id,
                    kb_id=kb_id,
                    query=user_query,
                    recent_messages=self._to_memory_messages(validated_messages),
                )
                model_context = self._memory_injector.build_model_context(memory_context)
                memory_prompt = model_context.render(source_filter={"memory"})
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
                        trace_id=trace_id,
                        turn_id=turn_id,
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
            "context_compaction": self._last_compaction_stats,
            "graph": self._graph_runner.health_snapshot(),
            "action_score": self._last_action_score,
        }

    async def _summarize_for_autocompact(self, transcript: str) -> str:
        try:
            return await self._compaction_subagent.summarize_transcript(transcript)
        except Exception as exc:  # noqa: BLE001
            logger.warning("autocompact_summarize_failed err=%s", exc)
            return ""

    def _persist_compaction_transcript(self, session_id: int | None, messages: list[ChatMessage]) -> str:
        try:
            return self._transcript_store.save(session_id, messages)
        except Exception as exc:  # noqa: BLE001
            logger.warning("autocompact_persist_failed session=%s err=%s", session_id, exc)
            return ""
