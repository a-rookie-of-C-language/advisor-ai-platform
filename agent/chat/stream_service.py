from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import AsyncIterator, Awaitable, Callable, Iterable

from agent.json_types import JsonObject
from agents.search import WebFetchSubAgent, WebSearchSubAgent
from agents.tool_explorer import ToolExplorerSubAgent
from context.compaction.ContextCompactionSubAgent import ContextCompactionSubAgent
from context.compaction.ContextCompactor import ContextCompactor
from context.compaction.TranscriptStore import TranscriptStore
from context.memory.core.schema import MemoryCandidate
from context.memory.long_term_memory import OrchestratorLongTermMemoryAdapter
from context.memory.memory_injector import MemoryInjector
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from eval.action_score import score_action
from fusion.authority_boost import AuthorityBoostStrategy
from fusion.conflict_detect import ConflictDetectStrategy
from fusion.registry import SourcePriorityRegistry
from fusion.source_weight import SourceWeightStrategy
from fusion.time_decay import TimeDecayStrategy
from graph.runner import GraphRunner
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from memory.failure_memory_matcher import FailureMemoryMatcher
from memory.failure_memory_store import FailureMemoryItem, FailureMemoryStore
from prompt.PromptBuilder import PromptBuilder
from query_engine.ConversationQueryEngine import ConversationQueryEngine
from query_engine.EngineContext import EngineContext
from query_engine.GraphEngineStrategy import GraphEngineStrategy
from query_engine.LegacyEngineStrategy import LegacyEngineStrategy
from safety.safety_pipeline import SafetyPipeline
from skills.presets import build_default_registry
from tools.expand_skill import ExpandSkillTool
from tools.intent_router import IntentRouter, emit_route_observation
from tools.tool_assembly_pool import ToolAssemblyPool
from tools.tool_permission import PermissionConfig, ToolPermission
from tools.tool_registry import ToolRegistry
from tools.tool_search import ToolSearchTool

_ALLOWED_ROLES = {"system", "user", "assistant"}
Extractor = Callable[[str, str], list[MemoryCandidate] | Awaitable[list[MemoryCandidate]]]
logger = logging.getLogger(__name__)
_EVENT_VERSION = "1.0"
_URL_PATTERN = re.compile(r"https?://[^\s)>\"]+")

def _u(*codes: int) -> str:
    return "".join(chr(code) for code in codes)

_STREAM_ERROR_MESSAGE = _u(
    0x670d, 0x52a1, 0x5185, 0x90e8, 0x9519, 0x8bef, 0xff0c,
    0x8bf7, 0x7a0d, 0x540e, 0x91cd, 0x8bd5,
)
_RAG_PRIORITY_HINTS = {
    _u(0x77e5, 0x8bc6, 0x5e93),
    _u(0x8d44, 0x6599),
    _u(0x6587, 0x6863),
    _u(0x6839, 0x636e),
    _u(0x51fa, 0x5904),
    _u(0x8f85, 0x5bfc, 0x5458),
    _u(0x5b66, 0x751f),
}
_REALTIME_HINTS = {
    _u(0x5929, 0x6c14),
    _u(0x5b9e, 0x65f6),
    _u(0x4eca, 0x5929),
    _u(0x660e, 0x5929),
    _u(0x65b0, 0x95fb),
    _u(0x80a1, 0x4ef7),
    _u(0x6c47, 0x7387),
    _u(0x6bd4, 0x5206),
}

def _build_default_fusion_pipeline() -> SourcePriorityRegistry:
    """Build the default cross-source fusion pipeline."""
    registry = SourcePriorityRegistry()
    registry.register(AuthorityBoostStrategy())
    registry.register(TimeDecayStrategy())
    registry.register(SourceWeightStrategy())
    registry.register(ConflictDetectStrategy())
    return registry


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
        self._compaction_subagent = ContextCompactionSubAgent(
            self._build_context_compaction_provider()
        )
        self._tool_explorer_subagent = ToolExplorerSubAgent(
            self._build_tool_explorer_provider(),
            max_steps=self._read_tool_explorer_max_steps(),
        )
        self._transcript_store = TranscriptStore(self._read_context_transcript_dir())
        self._tools = ToolRegistry(enabled_tools=self._enabled_tools)
        self._tool_permission = PermissionConfig.from_allowed_tools(
            {ToolPermission.RAG_READ, ToolPermission.MEMORY_READ,
             ToolPermission.MEMORY_WRITE},
            read_resources={"context", "memory"},
            write_resources={"memory"},
        )
        self._feature_action_scoring = self._read_feature_action_scoring()
        self._feature_failure_memory_inject = self._read_feature_failure_memory_inject()
        self._action_score_threshold = self._read_action_score_threshold()
        self._failure_memory_store = FailureMemoryStore(self._read_failure_memory_dir())
        self._last_action_score: JsonObject = {}
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
        # ToolAssemblyPool.build() 会自动加载 MCP 工具
        tools = ToolAssemblyPool.build(
            rag_service=rag_service,
            memory_client=memory_client,
        )
        for tool in tools:
            self._tools.register(tool)
        # 注册工具到意图路由器，用于查询模式匹配
        self._intent_router = IntentRouter()
        self._web_search_subagent = self._build_web_search_subagent()
        self._web_fetch_subagent = self._build_web_fetch_subagent()
        self._intent_router.register_tools(tools)
        self._skill_registry = build_default_registry()
        self._tools.register(ExpandSkillTool(self._skill_registry))
        self._tool_search_tool = ToolSearchTool(lambda: self._tools.specs())
        self._tools.register(self._tool_search_tool)
        self._safety_pipeline = SafetyPipeline()
        self._fusion_pipeline = _build_default_fusion_pipeline()
        self._graph_runner = GraphRunner(
            provider=self._provider,
            memory_orchestrator=self._memory_orchestrator,
            llm_extractor=self._llm_extractor,
            tools=self._tools,
            tool_permission=self._tool_permission,
            debug_stream=self._debug_stream,
            enable_tool_use=self._enable_tool_use,
            skill_registry=self._skill_registry,
            intent_router=self._intent_router,
            safety_pipeline=self._safety_pipeline,
            fusion_pipeline=self._fusion_pipeline,
            web_search_subagent=self._web_search_subagent,
        )


    @staticmethod
    def _strip_surrogates(text: str) -> str:
        if not text:
            return text
        return "".join(ch for ch in text if not (0xD800 <= ord(ch) <= 0xDFFF))

    @classmethod
    def _prefer_rag_only(cls, query: str) -> bool:
        normalized = cls._strip_surrogates(query).strip().lower()
        if not normalized:
            return False
        has_rag_hint = any(key in normalized for key in _RAG_PRIORITY_HINTS)
        has_realtime_hint = any(key in normalized for key in _REALTIME_HINTS)
        return has_rag_hint and not has_realtime_hint

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
    def _read_tool_explorer_max_steps() -> int:
        raw = os.getenv("TOOL_EXPLORER_MAX_STEPS", "2").strip()
        try:
            return max(min(int(raw), 5), 1)
        except ValueError:
            return 2

    def _build_subagent_provider(
        self,
        *,
        env_prefix: str,
        default_model: str | None = None,
        temperature_default: float = 0.0,
        timeout_default: float = 30.0,
        max_retries_default: int = 0,
        stream_timeout_default: float = 30.0,
        tool_round_timeout_default: float = 20.0,
        stream_idle_timeout_default: float = 45.0,
    ) -> BaseLLMProvider:
        env_model = os.getenv(f"{env_prefix}_MODEL", "").strip()
        model = env_model or default_model or ""
        if not model:
            return self._provider
        if env_model:
            api_key = os.getenv(f"{env_prefix}_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
            base_url = os.getenv(f"{env_prefix}_BASE_URL", "").strip() or os.getenv("OPENAI_BASE_URL", "").strip()
            if not api_key or not base_url:
                logger.warning(
                    "%s_MODEL configured but api key/base url missing, fallback to main provider",
                    env_prefix,
                )
                return self._provider
            try:
                from llm.openai_provider import OpenAIProvider
                from llm.provider_factory import _read_float_env, _read_int_env
                from llm.thinking_config import ThinkingConfig

                return OpenAIProvider(
                    api_key=api_key,
                    model=model,
                    base_url=base_url,
                    temperature=_read_float_env(f"{env_prefix}_TEMPERATURE", temperature_default),
                    timeout=_read_float_env(f"{env_prefix}_TIMEOUT_SEC", timeout_default),
                    max_retries=_read_int_env(f"{env_prefix}_MAX_RETRIES", max_retries_default),
                    stream_timeout_sec=_read_float_env(f"{env_prefix}_STREAM_TIMEOUT_SEC", stream_timeout_default),
                    tool_round_timeout_sec=_read_float_env(
                        f"{env_prefix}_TOOL_ROUND_TIMEOUT_SEC",
                        tool_round_timeout_default,
                    ),
                    stream_idle_timeout_sec=_read_float_env(
                        f"{env_prefix}_STREAM_IDLE_TIMEOUT_SEC",
                        stream_idle_timeout_default,
                    ),
                    thinking_config=ThinkingConfig.disabled(),
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to build %s provider, fallback to main provider: %s",
                    env_prefix.lower(),
                    exc,
                )
                return self._provider

        try:
            return self._provider.with_model(model)
        except NotImplementedError:
            logger.warning(
                "%s_DEFAULT_MODEL configured but provider does not support model override, fallback to main provider",
                env_prefix,
            )
            return self._provider

    def _build_tool_explorer_provider(self) -> BaseLLMProvider:
        return self._build_subagent_provider(
            env_prefix=ToolExplorerSubAgent.MODEL_ENV_PREFIX,
            default_model=ToolExplorerSubAgent.DEFAULT_MODEL,
        )

    def _build_context_compaction_provider(self) -> BaseLLMProvider:
        return self._build_subagent_provider(
            env_prefix=ContextCompactionSubAgent.MODEL_ENV_PREFIX,
            default_model=ContextCompactionSubAgent.DEFAULT_MODEL,
        )

    def _build_web_search_provider(self) -> BaseLLMProvider:
        return self._build_subagent_provider(
            env_prefix=WebSearchSubAgent.MODEL_ENV_PREFIX,
            default_model=WebSearchSubAgent.DEFAULT_MODEL,
        )

    def _build_web_fetch_provider(self) -> BaseLLMProvider:
        return self._build_subagent_provider(
            env_prefix=WebFetchSubAgent.MODEL_ENV_PREFIX,
            default_model=WebFetchSubAgent.DEFAULT_MODEL,
        )

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
    def _event_envelope(
        *,
        source: str,
        trace_id: str | None,
        payload: JsonObject,
    ) -> JsonObject:
        return {
            "event_version": _EVENT_VERSION,
            "trace_id": trace_id or "",
            "timestamp": int(time.time() * 1000),
            "source": source,
            "payload": payload,
        }

    def _serialize_protocol_event(
        self,
        *,
        event: str,
        source: str,
        trace_id: str | None,
        payload: JsonObject,
    ) -> str:
        return self._serialize_event(
            event,
            self._event_envelope(source=source, trace_id=trace_id, payload=payload),
        )

    @staticmethod
    def _build_stream_error_payload(code: str, message: str, retryable: bool) -> JsonObject:
        return {
            "code": code,
            "message": message,
            "retryable": retryable,
        }

    @staticmethod
    def _build_tool_error_payload(
        base_payload: JsonObject,
        code: str,
        message: str,
        retryable: bool,
    ) -> JsonObject:
        return {
            **base_payload,
            "code": code,
            "message": message,
            "retryable": retryable,
        }

    async def _emit_terminal_error(
        self,
        *,
        trace_id: str | None,
        code: str,
        message: str,
        retryable: bool,
    ) -> AsyncIterator[str]:
        yield self._serialize_protocol_event(
            event="sys_error",
            source="system",
            trace_id=trace_id,
            payload=self._build_stream_error_payload(code, message, retryable),
        )
        yield self._serialize_protocol_event(
            event="sys_done",
            source="system",
            trace_id=trace_id,
            payload={"finish_reason": "stream_finished_with_error"},
        )

    @staticmethod
    def _validate_messages(messages: Iterable[ChatMessage]) -> list[ChatMessage]:
        validated = []
        for message in messages:
            role = message.role.strip().lower()
            raw_content = message.content.strip()
            content = ChatStreamService._strip_surrogates(raw_content).strip()
            if role not in _ALLOWED_ROLES:
                raise ValueError(f"Unsupported role: {message.role}")
            if not content:
                raise ValueError("Message content cannot be empty")
            if content != raw_content:
                logger.warning("Invalid surrogate chars removed from message: role=%s", role)
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
    def _extract_first_url(text: str) -> str:
        found = _URL_PATTERN.search(text or "")
        return found.group(0) if found else ""

    @staticmethod
    def _looks_like_exploration_query(query: str, messages: Iterable[ChatMessage]) -> bool:
        normalized = query.strip().lower()
        if not normalized:
            return False
        direct_hints = (
            "具体",
            "哪些",
            "名单",
            "列表",
            "列出",
            "都有谁",
            "是谁",
            "多少",
            "几个",
            "几名",
            "详情",
            "明细",
        )
        if any(hint in normalized for hint in direct_hints):
            return True
        recent_text = "\n".join((message.content or "") for message in list(messages)[-4:]).lower()
        follow_up_hints = ("他们", "这些", "那些", "这个", "那个", "都有哪些")
        return any(hint in normalized for hint in follow_up_hints) and bool(recent_text)

    @staticmethod
    def _build_explorer_context(outcome) -> str:
        payload = {
            "summary": outcome.summary,
            "evidence": outcome.evidence,
            "tool_calls": outcome.tool_calls,
        }
        return (
            "A read-only tool explorer has gathered evidence for the current user question. "
            "Use only this evidence and the visible conversation to answer. "
            "If the evidence is insufficient, say what is missing.\n"
            f"{json.dumps(payload, ensure_ascii=False, default=str)}"
        )


    @staticmethod
    def _parse_serialized_event(raw: str) -> JsonObject:
        event_name = "message"
        data: JsonObject = {}
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
        payload = data.get("payload")
        if isinstance(payload, dict):
            data = payload
        return {"event": event_name, "data": data}

    async def _stream_with_progress(
        self,
        event_stream: AsyncIterator[str],
        *,
        trace_id: str | None,
    ) -> AsyncIterator[str]:
        iterator = event_stream.__aiter__()
        progress_seconds = 0
        saw_delta = False
        saw_done = False
        saw_error = False
        pending_next: asyncio.Task[str] | None = None
        while True:
            if pending_next is None:
                pending_next = asyncio.create_task(iterator.__anext__())
            try:
                event = await asyncio.wait_for(asyncio.shield(pending_next), timeout=1.0)
                pending_next = None
            except TimeoutError:
                if not saw_delta:
                    progress_seconds += 1
                    yield self._serialize_protocol_event(
                        event="sys_progress",
                        source="system",
                        trace_id=trace_id,
                        payload={"message": "思考模式中考量中，请稍候...", "elapsed_sec": progress_seconds},
                    )
                continue
            except StopAsyncIteration:
                if not saw_delta and not saw_done and not saw_error:
                    yield self._serialize_event(
                        "error",
                        {"message": "stream finished without content"},
                    )
                return
            except Exception:
                pending_next = None
                raise

            parsed = self._parse_serialized_event(event)
            event_name = str(parsed.get("event", ""))
            if event_name in {"llm_data", "llm_delta", "raw", "delta"}:
                saw_delta = True
            if event_name == "error":
                saw_error = True
            if event_name == "done":
                saw_done = True
            if event_name == "done" and not saw_delta and not saw_error:
                yield self._serialize_event(
                    "error",
                    {"message": "stream finished without content"},
                )
                return
            yield event

    def _build_failure_avoid_prompt(self, matched: JsonObject) -> str:
        return PromptBuilder.build_failure_avoid_prompt(matched)

    def _write_failure_memory(
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
        self._failure_memory_store.append(item)

    async def _execute_tool(
        self,
        tool_name: str,
        tool_args: dict,
        user_id: int | None,
        session_id: int | None,
        user_query: str,
        trace_id: str | None = None,
        turn_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> str:
        context = {
            "user_id": user_id,
            "session_id": session_id,
            "user_query": user_query,
            "trace_id": trace_id,
            "turn_id": turn_id,
            "permission_config": self._tool_permission,
        }
        if idempotency_key:
            context["idempotency_key"] = idempotency_key
        try:
            if tool_name == "web_fetch":
                try:
                    fetch_result = (
                        await self._execute_web_fetch_via_subagent(tool_args)
                        if self._web_fetch_subagent is not None
                        else await self._tools.execute(tool_name, tool_args, context)
                    )
                except Exception:
                    fetch_result = json.dumps(
                        {
                            "ok": False,
                            "status": "error",
                            "message": "web_fetch_exception",
                            "items": [],
                        }
                    )
                try:
                    payload = json.loads(fetch_result)
                except Exception:
                    payload = {}
                status = str(payload.get("status", "") or "")
                ok = bool(payload.get("ok", False))
                items = payload.get("items")
                has_items = isinstance(items, list) and bool(items)
                if ok and status == "hit" and has_items:
                    return fetch_result
                if self._web_search_subagent is None:
                    return fetch_result
                fallback_query = str(tool_args.get("url", "") or user_query).strip()
                if not fallback_query:
                    return fetch_result
                logger.info(
                    "tool_fallback web_fetch->web_search: session_id=%s, user_id=%s, query=%s",
                    session_id,
                    user_id,
                    fallback_query[:120],
                )
                return await self._execute_web_search_via_subagent(
                    {"query": fallback_query, "max_results": 5}
                )
            if tool_name == "web_search" and self._web_search_subagent is not None:
                return await self._execute_web_search_via_subagent(tool_args)
            return await self._tools.execute(tool_name, tool_args, context)
        except Exception:
            logger.exception(
                "Tool execute failed: tool=%s, user_id=%s, session_id=%s",
                tool_name,
                user_id,
                session_id,
            )
            return json.dumps(
                {
                    "ok": False,
                    "status": "error",
                    "message": "tool_execute_failed",
                    "items": [],
                }
            )

    def _build_web_search_subagent(self) -> WebSearchSubAgent | None:
        web_search_tool = self._tools.get("web_search")
        if web_search_tool is None:
            return None
        return WebSearchSubAgent(
            llm_provider=self._build_web_search_provider(),
            web_search_tool=web_search_tool,
        )

    async def _execute_web_search_via_subagent(self, tool_args: dict) -> str:
        query = tool_args.get("query", "")
        max_results = tool_args.get("max_results", 5)
        result = await self._web_search_subagent.search(query, max_results=max_results)
        if not result.safe:
            return json.dumps({
                "ok": False,
                "status": "denied",
                "message": result.filtered_reason or "搜索结果不合规，已过滤",
                "items": [],
            })
        items = [
            {
                "title": src.get("title", ""),
                "snippet": result.summary,
                "url": src.get("url", ""),
                "source": "web",
            }
            for src in result.sources
        ]
        return json.dumps({
            "ok": True,
            "status": "hit" if items else "miss",
            "message": "hit" if items else "no results",
            "items": items,
        })

    def _build_web_fetch_subagent(self) -> WebFetchSubAgent | None:
        web_fetch_tool = self._tools.get("web_fetch")
        if web_fetch_tool is None:
            return None
        return WebFetchSubAgent(
            llm_provider=self._build_web_fetch_provider(),
            web_fetch_tool=web_fetch_tool,
        )

    async def _execute_web_fetch_via_subagent(self, tool_args: dict) -> str:
        url = tool_args.get("url", "")
        max_content_length = tool_args.get("max_content_length", 2000)
        result = await self._web_fetch_subagent.fetch(url, max_content_length=max_content_length)
        if not result.safe:
            return json.dumps({
                "ok": False,
                "status": "denied",
                "message": result.filtered_reason or "网页内容不合规，已过滤",
                "items": [],
            })
        return json.dumps({
            "ok": True,
            "status": "hit",
            "message": "content extracted",
            "items": [{
                "url": result.url,
                "content": result.content,
                "source": result.source,
            }],
        })

    @staticmethod
    def _derive_tool_result(tool_name: str, payload: dict) -> dict:
        if tool_name != "rag_search":
            return {}
        items = payload.get("items", [])
        if not isinstance(items, list) or not items:
            return {}
        sources = []
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            sources.append(
                {
                    "id": item.get("id") or index + 1,
                    "docName": item.get("docName") or "",
                    "snippet": item.get("snippet") or "",
                    "score": item.get("score"),
                }
            )
        return {"sources": sources} if sources else {}

    def _build_tool_result_payload(self, tool_name: str, base_payload: dict, payload: dict) -> dict:
        result_payload = {
            **base_payload,
            "output": payload,
            "items": payload.get("items", []),
        }
        derived = self._derive_tool_result(tool_name, payload)
        if derived:
            result_payload["derived"] = derived
        return result_payload

    async def stream_events(
        self,
        messages: Iterable[ChatMessage],
        user_id: int | None = None,
        session_id: int | None = None,
        kb_id: int | None = None,
        trace_id: str | None = None,
        turn_id: str | None = None,
    ) -> AsyncIterator[str]:
        _ = kb_id
        validated_messages = self._validate_messages(messages)
        user_query = self._last_user_message(validated_messages)
        if self._feature_failure_memory_inject and user_query:
            recent = self._failure_memory_store.load_recent(limit=200)
            matched = FailureMemoryMatcher.match(user_query, recent)
            if matched:
                prompt = self._build_failure_avoid_prompt(matched)
                if prompt:
                    validated_messages = PromptBuilder.assemble_messages(validated_messages, dynamic_prompts=[prompt])

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
            "stream_events start: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s",
            trace_id,
            turn_id,
            session_id,
            user_id,
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
        logger.info(
            "stream_events start: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, kb_id=%s",
            trace_id,
            turn_id,
            session_id,
            user_id,
            kb_id,
        )
        if self._use_langgraph:
            async for event in self._stream_with_progress(self._stream_events_graph(
                validated_messages,
                user_id=user_id,
                session_id=session_id,
                trace_id=trace_id,
                turn_id=turn_id,
            ), trace_id=trace_id):
                trace_events.append(self._parse_serialized_event(event))
                yield event
        else:
            async for event in self._stream_with_progress(self._stream_events_legacy(
                compacted_messages,
                user_id=user_id,
                session_id=session_id,
                trace_id=trace_id,
                turn_id=turn_id,
            ), trace_id=trace_id):
                trace_events.append(self._parse_serialized_event(event))
                yield event

        if self._feature_action_scoring:
            action_score = score_action(user_query=user_query, trace_events=trace_events)
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
                    score=action_score.total,
                    reasons=action_score.reasons,
                )

    async def _stream_events_graph(
        self,
        validated_messages: list[ChatMessage],
        *,
        user_id: int | None,
        session_id: int | None,
        trace_id: str | None,
        turn_id: str | None,
    ) -> AsyncIterator[str]:
        user_query = self._last_user_message(validated_messages)
        yield self._serialize_protocol_event(
            event="sys_start",
            source="system",
            trace_id=trace_id,
            payload={"message": "stream_started"},
        )
        saw_content = False
        try:
            async for event in self._graph_runner.run_stream(
                messages=validated_messages,
                user_query=user_query,
                user_id=user_id,
                session_id=session_id,
                trace_id=trace_id,
                turn_id=turn_id,
            ):
                raw_event_name = str(event.get("event", ""))
                event_name = {
                    "delta": "llm_data",
                    "sources": "tool_result",
                    "error": "sys_error",
                    "done": "sys_done",
                    "start": "sys_start",
                }.get(raw_event_name, raw_event_name)
                event_data = event.get("data", {})
                if event_name in {"llm_data", "llm_delta", "raw"} and isinstance(event_data, dict):
                    text = str(event_data.get("text", "") or event_data.get("raw", ""))
                    if text:
                        saw_content = True
                        yield self._serialize_protocol_event(
                            event="llm_data",
                            source="llm",
                            trace_id=trace_id,
                            payload={"text": text},
                        )
                        continue
                event_source = (
                    "llm" if event_name in {"llm_data", "llm_delta"}
                    else ("tool" if event_name.startswith("tool_") else "system")
                )
                yield self._serialize_protocol_event(
                    event=event_name,
                    source=event_source,
                    trace_id=trace_id,
                    payload=event_data if isinstance(event_data, dict) else {},
                )
            if not saw_content:
                logger.warning(
                    "Graph stream produced no content, fallback to legacy: user_id=%s, session_id=%s",
                    user_id,
                    session_id,
                )
                async for legacy_event in self._stream_events_legacy(
                    validated_messages,
                    user_id=user_id,
                    session_id=session_id,
                    trace_id=trace_id,
                    turn_id=turn_id,
                ):
                    parsed = self._parse_serialized_event(legacy_event)
                    if str(parsed.get("event", "")) == "sys_start":
                        continue
                    yield legacy_event
                return
            yield self._serialize_protocol_event(
                event="sys_done",
                source="system",
                trace_id=trace_id,
                payload={"finish_reason": "stream_finished"},
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "Graph stream failed: user_id=%s, session_id=%s",
                user_id,
                session_id,
            )
            if self._debug_stream:
                logger.warning("debug_stream python error(graph): error=%s", exc)
            try:
                async for terminal_event in self._emit_terminal_error(
                    trace_id=trace_id,
                    code="internal_error",
                    message=_STREAM_ERROR_MESSAGE,
                    retryable=True,
                ):
                    yield terminal_event
            except Exception as send_error_exc:  # noqa: BLE001
                logger.warning("Failed to send stream error event: %s", send_error_exc)
                return

    async def _stream_events_legacy(
        self,
        validated_messages: list[ChatMessage],
        *,
        user_id: int | None,
        session_id: int | None,
        trace_id: str | None,
        turn_id: str | None,
    ) -> AsyncIterator[str]:
        model_messages = list(validated_messages)
        user_query = self._last_user_message(validated_messages)

        memory_enabled = (
            self._long_term_memory is not None
            and user_id is not None
            and session_id is not None
            and bool(user_query)
        )

        rag_enabled = bool(self._tools.specs()) and bool(user_query)

        if memory_enabled:
            try:
                memory_context = await self._long_term_memory.load_memory_context(
                    user_id=user_id,
                    session_id=session_id,
                    kb_id=0,
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
                    "Memory load failed, degrade to no-memory mode: user_id=%s, session_id=%s, error=%s",
                    user_id,
                    session_id,
                    exc,
                )

        yield self._serialize_protocol_event(
            event="sys_start",
            source="system",
            trace_id=trace_id,
            payload={"message": "stream_started"},
        )

        answer_parts: list[str] = []
        debug_preview: list[str] = []
        debug_chars = 0
        debug_limit = 200
        debug_delta_count = 0
        try:
            if rag_enabled and self._enable_tool_use:
                all_cats = self._tools.all_categories()
                route_decision = await self._intent_router.route_decision(
                    user_query,
                    all_cats,
                    provider=self._provider,
                )
                matched_tools = list(route_decision.matched_tools) if route_decision.matched_tools else []
                if matched_tools:
                    tools = self._tools.specs_by_names(matched_tools)
                else:
                    tools = self._tools.specs_by_categories(route_decision.categories)
                if self._prefer_rag_only(user_query) and not matched_tools:
                    rag_tool = self._tools.get("rag_search")
                    if rag_tool is not None:
                        tools = [rag_tool.to_tool_spec()]
                route_payload = await emit_route_observation(
                    route_decision,
                    logger=logger,
                    scope="legacy",
                    session_id=session_id,
                )
                yield self._serialize_protocol_event(
                    event=f"sys_{route_decision.event_name}",
                    source="system",
                    trace_id=trace_id,
                    payload=route_payload,
                )

                async def tool_executor(tool_name: str, tool_args: dict, **kwargs) -> str:
                    return await self._execute_tool(
                        tool_name=tool_name,
                        tool_args=tool_args,
                        user_id=user_id,
                        session_id=session_id,
                        user_query=user_query,
                        trace_id=trace_id,
                        turn_id=turn_id,
                        idempotency_key=kwargs.get("idempotency_key"),
                    )

                force_fetch_url = ""
                if matched_tools and "web_fetch" in matched_tools:
                    force_fetch_url = self._extract_first_url(user_query)
                if force_fetch_url:
                    yield self._serialize_protocol_event(
                        event="tool_use",
                        source="tool",
                        trace_id=trace_id,
                        payload={
                            "tool_name": "web_fetch",
                            "tool_call_id": "web_fetch-1",
                            "input": {"url": force_fetch_url, "max_content_length": 4000},
                        },
                    )
                    raw_output = await tool_executor(
                        "web_fetch",
                        {"url": force_fetch_url, "max_content_length": 4000},
                    )
                    try:
                        payload = json.loads(raw_output) if raw_output else {}
                    except Exception:
                        payload = {}
                    status = payload.get("status", "error")
                    base_payload = {
                        "tool_name": "web_fetch",
                        "tool_call_id": "web_fetch-1",
                        "attempt": 1,
                        "status": status,
                        "message": payload.get("message", "tool execute failed"),
                    }
                    if payload.get("ok"):
                        yield self._serialize_protocol_event(
                            event="tool_result",
                            source="tool",
                            trace_id=trace_id,
                            payload=self._build_tool_result_payload("web_fetch", base_payload, payload),
                        )
                    else:
                        yield self._serialize_protocol_event(
                            event="tool_error",
                            source="tool",
                            trace_id=trace_id,
                            payload=self._build_tool_error_payload(
                                base_payload,
                                status,
                                payload.get("message", "tool execute failed"),
                                False,
                            ),
                        )
                    fetched_items = payload.get("items", [])
                    if isinstance(fetched_items, list) and fetched_items:
                        first = fetched_items[0] if isinstance(fetched_items[0], dict) else {}
                        content = str(first.get("content", "") or "").strip()
                        if content:
                            model_messages = PromptBuilder.assemble_messages(
                                model_messages,
                                dynamic_prompts=[
                                    "请严格基于以下网页原文回答，并明确标注不确定处：\n" + content[:4000]
                                ],
                            )
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
                        yield self._serialize_protocol_event(
                            event="llm_data",
                            source="llm",
                            trace_id=trace_id,
                            payload={"text": delta},
                        )
                    answer = "".join(answer_parts).strip()
                    if self._debug_stream:
                        logger.info(
                            "debug_stream python done: deltas=%s, answer_preview=%s",
                            debug_delta_count,
                            "".join(debug_preview),
                        )
                    yield self._serialize_protocol_event(
                        event="sys_done",
                        source="system",
                        trace_id=trace_id,
                        payload={"finish_reason": "stream_finished"},
                    )
                    return

                async for event in self._provider.stream_chat_with_tools(
                    model_messages,
                    final_tools,
                    tool_executor,
                    max_tool_calls=1,
                    max_tool_retries=3,
                    on_tool_result=on_tool_result if deferred_specs and len(tools) > _DEFER_THRESHOLD else None,
                ):
                    if event.type == "tool_call":
                        yield self._serialize_protocol_event(
                            event="tool_use",
                            source="tool",
                            trace_id=trace_id,
                            payload={
                                "tool_name": event.tool_name,
                                "tool_call_id": f"{event.tool_name}-{event.attempt or 1}",
                                "input": event.tool_args or {},
                            },
                        )
                        continue
                    if event.type == "tool_result":
                        try:
                            payload = json.loads(event.tool_output) if event.tool_output else {}
                        except Exception:
                            logger.warning(
                                "tool_output parse failed: tool=%s, output=%s",
                                event.tool_name,
                                (event.tool_output or "")[:200],
                            )
                            payload = {}
                        base_payload = {
                            "tool_name": event.tool_name,
                            "tool_call_id": f"{event.tool_name}-{event.attempt or 1}",
                            "attempt": event.attempt,
                            "status": payload.get("status", "error"),
                            "message": payload.get("message", "tool execute failed"),
                        }
                        if event.success:
                            yield self._serialize_protocol_event(
                                event="tool_result",
                                source="tool",
                                trace_id=trace_id,
                                payload=self._build_tool_result_payload(event.tool_name, base_payload, payload),
                            )
                        else:
                            yield self._serialize_protocol_event(
                                event="tool_error",
                                source="tool",
                                trace_id=trace_id,
                                payload=self._build_tool_error_payload(
                                    base_payload,
                                    str(payload.get("status", "error") or "error"),
                                    payload.get("message", "tool execute failed"),
                                    False,
                                ),
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
                    yield self._serialize_protocol_event(
                        event="llm_data",
                        source="llm",
                        trace_id=trace_id,
                        payload={"text": delta},
                    )
            else:
                reasoning_queue: asyncio.Queue[str] = asyncio.Queue()

                async def _emit_reasoning(text: str) -> None:
                    await reasoning_queue.put(text)

                async for delta in self._provider.stream_chat(
                    model_messages,
                    on_reasoning=_emit_reasoning,
                ):
                    while True:
                        try:
                            reasoning_text = reasoning_queue.get_nowait()
                            yield self._serialize_protocol_event(
                                event="reasoning_delta",
                                source="llm",
                                trace_id=trace_id,
                                payload={"text": reasoning_text},
                            )
                        except asyncio.QueueEmpty:
                            break

                    answer_parts.append(delta)
                    if self._debug_stream and debug_chars < debug_limit:
                        remain = debug_limit - debug_chars
                        piece = delta[:remain]
                        if piece:
                            debug_preview.append(piece)
                            debug_chars += len(piece)
                    if self._debug_stream:
                        debug_delta_count += 1
                    yield self._serialize_protocol_event(
                        event="llm_data",
                        source="llm",
                        trace_id=trace_id,
                        payload={"text": delta},
                    )
                while True:
                    try:
                        reasoning_text = reasoning_queue.get_nowait()
                        yield self._serialize_protocol_event(
                            event="reasoning_delta",
                            source="llm",
                            trace_id=trace_id,
                            payload={"text": reasoning_text},
                        )
                    except asyncio.QueueEmpty:
                        break

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
                        kb_id=0,
                        user_text=user_query,
                        assistant_text=answer,
                        recent_messages=self._to_memory_messages(validated_messages)
                        + [{"role": "assistant", "content": answer}],
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Memory flush failed, skip writeback: %s", exc)

            yield self._serialize_protocol_event(
                event="sys_done",
                source="system",
                trace_id=trace_id,
                payload={"finish_reason": "stream_finished"},
            )
        except Exception as exc:
            logger.exception(
                "Legacy stream failed: user_id=%s, session_id=%s",
                user_id,
                session_id,
            )
            if self._debug_stream:
                logger.warning(
                    "debug_stream python error: deltas=%s, answer_preview=%s, error=%s",
                    debug_delta_count,
                    "".join(debug_preview),
                    exc,
                )
            try:
                async for terminal_event in self._emit_terminal_error(
                    trace_id=trace_id,
                    code="internal_error",
                    message=_STREAM_ERROR_MESSAGE,
                    retryable=True,
                ):
                    yield terminal_event
            except Exception as send_error_exc:
                logger.warning("Failed to send stream error event: %s", send_error_exc)
                return

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
