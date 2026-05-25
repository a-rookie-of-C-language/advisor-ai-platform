from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator, Awaitable, Callable

from agents.search import WebFetchSubAgent, WebSearchSubAgent
from agents.task_planner.TaskPlannerSubAgent import TaskPlannerSubAgent
from agents.tool_explorer import ToolExplorerSubAgent
from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer
from chat.stream_protocol import (
    EVENT_VERSION,
    build_stream_error_payload,
    build_tool_error_payload,
    event_envelope,
    serialize_event,
    serialize_protocol_event,
)
from chat.stream_compaction import ChatStreamCompactionSupport
from chat.stream_failure_memory import ChatStreamFailureMemorySupport
from chat.stream_progress import wrap_stream_with_progress
from chat.stream_runtime_config import ChatStreamRuntimeConfig
from chat.subagent_provider_factory import SubagentProviderFactory
from chat.stream_tool_support import ChatStreamToolSupport
from chat.stream_message_utils import (
    build_explorer_context,
    extract_first_url,
    last_user_message,
    looks_like_exploration_query,
    parse_serialized_event,
    prefer_rag_only,
    to_memory_messages,
    validate_messages,
)
from context.compaction.ContextCompactionSubAgent import ContextCompactionSubAgent
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.long_term_memory import OrchestratorLongTermMemoryAdapter
from context.memory.memory_injector import MemoryInjector
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from fusion.authority_boost import AuthorityBoostStrategy
from fusion.conflict_detect import ConflictDetectStrategy
from fusion.registry import SourcePriorityRegistry
from fusion.source_weight import SourceWeightStrategy
from fusion.time_decay import TimeDecayStrategy
from graph.helpers import (
    _build_delegate_reasoning,
    _build_plan_reasoning,
    _build_route_reasoning,
    _should_force_education_rag,
)
from graph.runner import GraphRunner
from graph.tool_result_mapper import build_tool_result_payload
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from memory.failure_memory_store import FailureMemoryStore
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

Extractor = Callable[[str, str], list[MemoryCandidate] | Awaitable[list[MemoryCandidate]]]
logger = logging.getLogger(__name__)
_EVENT_VERSION = EVENT_VERSION
_DEFER_THRESHOLD = 8

def _u(*codes: int) -> str:
    return "".join(chr(code) for code in codes)

_STREAM_ERROR_MESSAGE = _u(
    0x670d, 0x52a1, 0x5185, 0x90e8, 0x9519, 0x8bef, 0xff0c,
    0x8bf7, 0x7a0d, 0x540e, 0x91cd, 0x8bd5,
)
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
        config = ChatStreamRuntimeConfig.from_env()
        self._subagent_provider_factory = SubagentProviderFactory(provider)
        self._memory_orchestrator = memory_orchestrator
        self._memory_injector = MemoryInjector()
        self._long_term_memory = (
            OrchestratorLongTermMemoryAdapter(memory_orchestrator)
            if memory_orchestrator is not None
            else None
        )
        self._llm_extractor = llm_extractor
        self._debug_stream = config.debug_stream
        self._enable_tool_use = config.enable_tool_use
        self._use_langgraph = config.use_langgraph
        self._enabled_tools = config.enabled_tools
        self._compaction_support = ChatStreamCompactionSupport(
            config=config,
            subagent=ContextCompactionSubAgent(self._build_context_compaction_provider()),
        )
        self._task_planner_subagent = TaskPlannerSubAgent(
            self._build_task_planner_provider()
        )
        self._tool_explorer_subagent = ToolExplorerSubAgent(
            self._build_tool_explorer_provider(),
            max_steps=config.tool_explorer_max_steps,
        )
        self._tools = ToolRegistry(enabled_tools=self._enabled_tools)
        self._tool_permission = PermissionConfig.from_allowed_tools(
            {ToolPermission.RAG_READ, ToolPermission.MEMORY_READ,
             ToolPermission.MEMORY_WRITE, ToolPermission.WORKSPACE_READ,
             ToolPermission.WORKSPACE_WRITE},
            read_resources={"context", "memory", "workspace"},
            write_resources={"memory", "workspace"},
        )
        self._feature_action_scoring = config.feature_action_scoring
        self._feature_failure_memory_inject = config.feature_failure_memory_inject
        failure_memory_store = FailureMemoryStore(config.failure_memory_dir)
        self._failure_memory_support = ChatStreamFailureMemorySupport(
            store=failure_memory_store,
            action_score_threshold=config.action_score_threshold,
        )
        self._last_action_score: JsonObject = {}
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
        self._tool_support = ChatStreamToolSupport(
            tools=self._tools,
            tool_permission=self._tool_permission,
            web_search_provider_factory=self._build_web_search_provider,
            web_fetch_provider_factory=self._build_web_fetch_provider,
        )
        self._web_search_subagent = self._tool_support.web_search_subagent
        self._web_fetch_subagent = self._tool_support.web_fetch_subagent
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
            task_planner_subagent=self._task_planner_subagent,
        )


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
        return self._subagent_provider_factory.build(
            env_prefix=env_prefix,
            default_model=default_model,
            temperature_default=temperature_default,
            timeout_default=timeout_default,
            max_retries_default=max_retries_default,
            stream_timeout_default=stream_timeout_default,
            tool_round_timeout_default=tool_round_timeout_default,
            stream_idle_timeout_default=stream_idle_timeout_default,
        )

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

    def _build_task_planner_provider(self) -> BaseLLMProvider:
        return self._build_subagent_provider(
            env_prefix=TaskPlannerSubAgent.MODEL_ENV_PREFIX,
            default_model=TaskPlannerSubAgent.DEFAULT_MODEL,
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
    def _serialize_event(event: str, data: dict) -> str:
        return serialize_event(event, data)

    @staticmethod
    def _event_envelope(
        *,
        source: str,
        trace_id: str | None,
        payload: JsonObject,
    ) -> JsonObject:
        return event_envelope(source=source, trace_id=trace_id, payload=payload)

    def _serialize_protocol_event(
        self,
        *,
        event: str,
        source: str,
        trace_id: str | None,
        payload: JsonObject,
    ) -> str:
        return serialize_protocol_event(event=event, source=source, trace_id=trace_id, payload=payload)

    @staticmethod
    def _build_stream_error_payload(code: str, message: str, retryable: bool) -> JsonObject:
        return build_stream_error_payload(code, message, retryable)

    @staticmethod
    def _build_tool_error_payload(
        base_payload: JsonObject,
        code: str,
        message: str,
        retryable: bool,
    ) -> JsonObject:
        return build_tool_error_payload(base_payload, code, message, retryable)

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
        validated_messages = validate_messages(messages)
        user_query = last_user_message(validated_messages)
        if self._feature_failure_memory_inject and user_query:
            validated_messages = self._failure_memory_support.inject_avoidance_prompt(
                validated_messages,
                user_query=user_query,
            )

        compacted_messages, compact_stats = await self._compaction_support.compact(
            validated_messages,
            session_id=session_id,
        )
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
            async for event in wrap_stream_with_progress(self._stream_events_graph(
                validated_messages,
                user_id=user_id,
                session_id=session_id,
                kb_id=kb_id,
                trace_id=trace_id,
                turn_id=turn_id,
            ), trace_id=trace_id):
                trace_events.append(parse_serialized_event(event))
                yield event
        else:
            async for event in wrap_stream_with_progress(self._stream_events_legacy(
                compacted_messages,
                user_id=user_id,
                session_id=session_id,
                trace_id=trace_id,
                turn_id=turn_id,
            ), trace_id=trace_id):
                trace_events.append(parse_serialized_event(event))
                yield event

        if self._feature_action_scoring:
            self._last_action_score = self._failure_memory_support.evaluate_trace_and_record(
                user_query=user_query,
                trace_events=trace_events,
                session_id=session_id,
                user_id=user_id,
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
        user_query = last_user_message(validated_messages)
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
                kb_id=kb_id,
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
                    "intent_route": "sys_intent_route",
                }.get(raw_event_name, raw_event_name)
                event_data = event.get("data", {})
                if event_name not in {"sys_start", "sys_done", "sys_error"}:
                    saw_content = True
                if event_name in {"llm_data", "llm_delta", "raw"} and isinstance(event_data, dict):
                    text = str(event_data.get("text", "") or event_data.get("raw", ""))
                    if text:
                        saw_content = True
                        output_event = (
                            "llm_delta"
                            if event_name == "llm_delta" and (user_id is None or session_id is None)
                            else "llm_data"
                        )
                        yield self._serialize_protocol_event(
                            event=output_event,
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
                    kb_id=kb_id,
                    trace_id=trace_id,
                    turn_id=turn_id,
                ):
                    parsed = parse_serialized_event(legacy_event)
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
        user_query = last_user_message(validated_messages)

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
                    recent_messages=to_memory_messages(validated_messages),
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

        answer_buffer = ChatStreamAnswerBuffer(debug_enabled=self._debug_stream)
        try:
            if rag_enabled and self._enable_tool_use:
                all_cats = self._tools.allowed_categories(self._tool_permission)
                route_decision = await self._intent_router.route_decision(
                    user_query,
                    all_cats,
                    provider=self._provider,
                )
                raw_matched_tools = list(route_decision.matched_tools) if route_decision.matched_tools else []
                matched_tools = [
                    name
                    for name in raw_matched_tools
                    if (tool := self._tools.get(name)) is not None and tool.category in all_cats
                ]
                if matched_tools:
                    tools = self._tools.specs_by_names(matched_tools)
                else:
                    tools = self._tools.specs_by_categories(route_decision.categories)
                if prefer_rag_only(user_query) and not matched_tools:
                    rag_tool = self._tools.get("rag_search")
                    if rag_tool is not None:
                        tools = [rag_tool.to_tool_spec()]
                deferred_specs = [tool for tool in tools if getattr(tool, "defer_loading", False)]
                route_payload = await emit_route_observation(
                    route_decision,
                    logger=logger,
                    scope="legacy",
                    session_id=session_id,
                )
                if matched_tools != raw_matched_tools:
                    route_payload = {
                        **route_payload,
                        "matched_tools": matched_tools,
                        "source": {
                            **route_payload.get("source", {}),
                            "matched_tools": matched_tools,
                        },
                    }
                if (
                    route_decision.matched_by in {"strong_rule", "score"}
                    and route_decision.categories == {"search"}
                    and not route_decision.matched_tools
                ):
                    route_payload = {
                        **route_payload,
                        "matched_by": "fallback",
                        "source": {
                            **route_payload.get("source", {}),
                            "decision": "fallback",
                        },
                    }
                yield self._serialize_protocol_event(
                    event=f"sys_{route_decision.event_name}",
                    source="system",
                    trace_id=trace_id,
                    payload=route_payload,
                )
                education_domain = _should_force_education_rag(user_query) and self._tools.get("rag_search") is not None
                exploration_query = looks_like_exploration_query(user_query, validated_messages)
                should_emit_planning = education_domain or exploration_query
                if should_emit_planning:
                    yield self._serialize_protocol_event(
                        event="sys_reasoning",
                        source="system",
                        trace_id=trace_id,
                        payload={
                            "stage": "route",
                            "message": _build_route_reasoning(
                                route_categories=sorted(route_decision.categories),
                                matched_tools=matched_tools,
                                education_domain=education_domain,
                            ),
                            "categories": sorted(route_decision.categories),
                            "matched_tools": matched_tools,
                        },
                    )
                task_plan: JsonObject = {}
                if should_emit_planning and self._task_planner_subagent is not None:
                    try:
                        yield self._serialize_protocol_event(
                            event="sys_reasoning",
                            source="system",
                            trace_id=trace_id,
                            payload={
                                "stage": "delegate",
                                "agent_name": "task_planner_subagent",
                                "message": _build_delegate_reasoning("task_planner_subagent"),
                            },
                        )
                        task_plan = await self._task_planner_subagent.plan(
                            user_query=user_query,
                            recent_messages=validated_messages,
                            available_tools=self._tools.allowed_specs(self._tool_permission),
                            route_context={
                                "categories": sorted(route_decision.categories),
                                "matched_tools": matched_tools,
                                "matched_by": route_decision.matched_by,
                                "confidence": route_decision.confidence,
                                "education_domain": education_domain,
                                "preferred_tools": ["rag_search"] if education_domain else [],
                            },
                        )
                        yield self._serialize_protocol_event(
                            event="sys_tool_plan",
                            source="system",
                            trace_id=trace_id,
                            payload=task_plan,
                        )
                        yield self._serialize_protocol_event(
                            event="sys_reasoning",
                            source="system",
                            trace_id=trace_id,
                            payload={
                                "stage": "plan",
                                "message": _build_plan_reasoning(task_plan),
                                "mode": task_plan.get("mode", ""),
                                "summary": task_plan.get("summary", ""),
                            },
                        )
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("task_planner failed, fallback to legacy tool flow: %s", exc)
                        task_plan = {}

                if exploration_query and self._tool_explorer_subagent is not None:
                    try:
                        yield self._serialize_protocol_event(
                            event="sys_reasoning",
                            source="system",
                            trace_id=trace_id,
                            payload={
                                "stage": "delegate",
                                "agent_name": "tool_explorer_subagent",
                                "message": _build_delegate_reasoning("tool_explorer_subagent"),
                            },
                        )
                        outcome = await self._tool_explorer_subagent.explore(
                            user_query=user_query,
                            recent_messages=validated_messages,
                            available_tools=self._tools.allowed_specs(self._tool_permission),
                            route_context={
                                "categories": sorted(route_decision.categories),
                                "matched_tools": matched_tools,
                                "matched_by": route_decision.matched_by,
                                "confidence": route_decision.confidence,
                            },
                        )
                        if outcome.used:
                            for explorer_event in outcome.events:
                                yield self._serialize_protocol_event(
                                    event=explorer_event.event,
                                    source="tool" if explorer_event.event.startswith("tool_") else "system",
                                    trace_id=trace_id,
                                    payload=explorer_event.payload,
                                )
                            model_messages = PromptBuilder.assemble_messages(
                                model_messages,
                                dynamic_prompts=[build_explorer_context(outcome)],
                            )
                            async for delta in self._provider.stream_chat(model_messages):
                                answer_buffer.append(delta)
                                yield self._serialize_protocol_event(
                                    event="llm_data",
                                    source="llm",
                                    trace_id=trace_id,
                                    payload={"text": delta},
                                )
                            yield self._serialize_protocol_event(
                                event="sys_done",
                                source="system",
                                trace_id=trace_id,
                                payload={"finish_reason": "stream_finished"},
                            )
                            return
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("tool_explorer failed, fallback to legacy tool flow: %s", exc)

                async def tool_executor(tool_name: str, tool_args: dict, **kwargs) -> str:
                    return await self._tool_support.execute_tool(
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
                    force_fetch_url = extract_first_url(user_query)
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
                            payload=build_tool_result_payload("web_fetch", base_payload, payload),
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
                        answer_buffer.append(delta)
                        yield self._serialize_protocol_event(
                            event="llm_data",
                            source="llm",
                            trace_id=trace_id,
                            payload={"text": delta},
                        )
                    if self._debug_stream:
                        logger.info(
                            "debug_stream python done: deltas=%s, answer_preview=%s",
                            answer_buffer.delta_count,
                            answer_buffer.debug_preview,
                        )
                    yield self._serialize_protocol_event(
                        event="sys_done",
                        source="system",
                        trace_id=trace_id,
                        payload={"finish_reason": "stream_finished"},
                    )
                    return

                tool_result_seen = False
                async for event in self._provider.stream_chat_with_tools(
                    model_messages,
                    tools,
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
                        tool_result_seen = True
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
                                payload=build_tool_result_payload(event.tool_name, base_payload, payload),
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
                    answer_buffer.append(delta)
                    yield self._serialize_protocol_event(
                        event="llm_delta" if tool_result_seen else "llm_data",
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

                    answer_buffer.append(delta)
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

            answer = answer_buffer.answer
            if self._debug_stream:
                logger.info(
                    "debug_stream python done: deltas=%s, answer_preview=%s",
                    answer_buffer.delta_count,
                    answer_buffer.debug_preview,
                )
            if memory_enabled and answer:
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
                    answer_buffer.delta_count,
                    answer_buffer.debug_preview,
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
            "context_compaction": self._compaction_support.last_stats,
            "graph": self._graph_runner.health_snapshot(),
            "action_score": self._last_action_score,
        }
