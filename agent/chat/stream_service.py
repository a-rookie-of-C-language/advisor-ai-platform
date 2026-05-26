from __future__ import annotations

import logging
from typing import AsyncIterator

from agents.task_planner.TaskPlannerSubAgent import TaskPlannerSubAgent
from agents.tool_explorer import ToolExplorerSubAgent
from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer
from chat.graph_stream_flow import stream_graph_events
from chat.legacy_force_fetch import resolve_force_fetch_url
from chat.legacy_force_fetch_flow import stream_legacy_force_fetch_response
from chat.legacy_llm_delta_stream import stream_legacy_llm_data
from chat.legacy_message_prepare import prepare_legacy_messages
from chat.legacy_plain_chat_flow import stream_legacy_plain_chat
from chat.legacy_tool_explorer_flow import prepare_legacy_tool_explorer_context
from chat.legacy_tool_chat_flow import stream_legacy_tool_chat_events
from chat.legacy_tool_route_flow import prepare_legacy_tool_route
from chat.stream_defaults import (
    DEFER_THRESHOLD,
    STREAM_ERROR_MESSAGE,
    Extractor,
    build_default_fusion_pipeline,
)
from chat.stream_protocol import (
    build_stream_error_payload,
    serialize_protocol_event,
)
from chat.stream_compaction import ChatStreamCompactionSupport
from chat.stream_failure_memory import ChatStreamFailureMemorySupport
from chat.stream_memory_context import ChatStreamMemoryContextSupport
from chat.stream_runtime_config import ChatStreamRuntimeConfig
from chat.stream_service_bootstrap import (
    build_stream_health,
    build_stream_tool_permission,
    build_stream_tool_registry,
)
from chat.subagent_provider_factory import SubagentProviderFactory
from chat.subagent_provider_builders import (
    build_context_compaction_provider,
    build_task_planner_provider,
    build_tool_explorer_provider,
    build_web_fetch_provider,
    build_web_search_provider,
)
from chat.stream_tool_support import ChatStreamToolSupport
from chat.stream_message_utils import (
    last_user_message,
    validate_messages,
)
from chat.stream_trace_flow import stream_with_progress_trace
from context.compaction.ContextCompactionSubAgent import ContextCompactionSubAgent
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from graph.runner import GraphRunner
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
from tools.intent_router import IntentRouter

logger = logging.getLogger(__name__)


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
        self._memory_context_support = ChatStreamMemoryContextSupport(memory_orchestrator)
        self._llm_extractor = llm_extractor
        self._debug_stream = config.debug_stream
        self._enable_tool_use = config.enable_tool_use
        self._use_langgraph = config.use_langgraph
        self._enabled_tools = config.enabled_tools
        self._compaction_support = ChatStreamCompactionSupport(
            config=config,
            subagent=ContextCompactionSubAgent(
                self._build_context_compaction_provider()
            ),
        )
        self._task_planner_subagent = TaskPlannerSubAgent(self._build_task_planner_provider())
        self._tool_explorer_subagent = ToolExplorerSubAgent(
            self._build_tool_explorer_provider(),
            max_steps=config.tool_explorer_max_steps,
        )
        self._tool_permission = build_stream_tool_permission()
        self._feature_action_scoring = config.feature_action_scoring
        self._feature_failure_memory_inject = config.feature_failure_memory_inject
        failure_memory_store = FailureMemoryStore(config.failure_memory_dir)
        self._failure_memory_support = ChatStreamFailureMemorySupport(
            store=failure_memory_store,
            action_score_threshold=config.action_score_threshold,
        )
        self._last_action_score: JsonObject = {}
        memory_client = getattr(self._memory_orchestrator, "api_client", None)
        (
            self._tools,
            assembled_tools,
            self._skill_registry,
            self._tool_search_tool,
        ) = build_stream_tool_registry(
            enabled_tools=self._enabled_tools,
            rag_service=rag_service,
            memory_client=memory_client,
        )
        self._intent_router = IntentRouter()
        self._tool_support = ChatStreamToolSupport(
            tools=self._tools,
            tool_permission=self._tool_permission,
            web_search_provider_factory=self._build_web_search_provider,
            web_fetch_provider_factory=self._build_web_fetch_provider,
        )
        self._web_search_subagent = self._tool_support.web_search_subagent
        self._web_fetch_subagent = self._tool_support.web_fetch_subagent
        self._intent_router.register_tools(assembled_tools)
        self._safety_pipeline = SafetyPipeline()
        self._fusion_pipeline = build_default_fusion_pipeline()
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

    def _build_tool_explorer_provider(self) -> BaseLLMProvider:
        return build_tool_explorer_provider(self._subagent_provider_factory)

    def _build_context_compaction_provider(self) -> BaseLLMProvider:
        return build_context_compaction_provider(self._subagent_provider_factory)

    def _build_task_planner_provider(self) -> BaseLLMProvider:
        return build_task_planner_provider(self._subagent_provider_factory)

    def _build_web_search_provider(self) -> BaseLLMProvider:
        return build_web_search_provider(self._subagent_provider_factory)

    def _build_web_fetch_provider(self) -> BaseLLMProvider:
        return build_web_fetch_provider(self._subagent_provider_factory)

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
            async for event in stream_with_progress_trace(
                self._stream_events_graph(
                    compacted_messages,
                    user_id=user_id,
                    session_id=session_id,
                    kb_id=kb_id,
                    trace_id=trace_id,
                    turn_id=turn_id,
                ),
                trace_id=trace_id,
                trace_events=trace_events,
            ):
                yield event
        else:
            async for event in stream_with_progress_trace(
                self._stream_events_legacy(
                    compacted_messages,
                    user_id=user_id,
                    session_id=session_id,
                    trace_id=trace_id,
                    turn_id=turn_id,
                ),
                trace_id=trace_id,
                trace_events=trace_events,
            ):
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
        async for event in stream_graph_events(
            graph_runner=self._graph_runner,
            validated_messages=validated_messages,
            user_id=user_id,
            session_id=session_id,
            kb_id=kb_id,
            trace_id=trace_id,
            turn_id=turn_id,
            debug_stream=self._debug_stream,
            serialize_protocol_event=self._serialize_protocol_event,
            emit_terminal_error=self._emit_terminal_error,
            legacy_fallback=lambda: self._stream_events_legacy(
                validated_messages,
                user_id=user_id,
                session_id=session_id,
                kb_id=kb_id,
                trace_id=trace_id,
                turn_id=turn_id,
            ),
        ):
            yield event

    async def _stream_events_legacy(
        self,
        validated_messages: list[ChatMessage],
        *,
        user_id: int | None,
        session_id: int | None,
        kb_id: int | None = None,
        trace_id: str | None,
        turn_id: str | None,
    ) -> AsyncIterator[str]:
        _ = kb_id
        prepared = await prepare_legacy_messages(
            validated_messages=validated_messages,
            user_id=user_id,
            session_id=session_id,
            memory_context_support=self._memory_context_support,
        )
        model_messages = prepared.model_messages
        user_query = prepared.user_query
        memory_enabled = prepared.memory_enabled
        rag_enabled = bool(self._tools.specs()) and bool(user_query)

        yield self._serialize_protocol_event(
            event="sys_start",
            source="system",
            trace_id=trace_id,
            payload={"message": "stream_started"},
        )

        answer_buffer = ChatStreamAnswerBuffer(debug_enabled=self._debug_stream)
        try:
            if rag_enabled and self._enable_tool_use:
                route_context = await prepare_legacy_tool_route(
                    user_query=user_query,
                    validated_messages=validated_messages,
                    session_id=session_id,
                    trace_id=trace_id,
                    provider=self._provider,
                    tools_registry=self._tools,
                    tool_permission=self._tool_permission,
                    intent_router=self._intent_router,
                    task_planner_subagent=self._task_planner_subagent,
                    serialize_protocol_event=self._serialize_protocol_event,
                    logger=logger,
                )
                for route_event in route_context.events:
                    yield route_event
                route_decision = route_context.route_decision
                matched_tools = route_context.matched_tools
                tools = route_context.tools
                deferred_specs = route_context.deferred_specs
                education_domain = route_context.education_domain
                exploration_query = route_context.exploration_query
                task_plan = route_context.task_plan

                if exploration_query and self._tool_explorer_subagent is not None:
                    try:
                        explorer_context = await prepare_legacy_tool_explorer_context(
                            exploration_query=exploration_query,
                            tool_explorer_subagent=self._tool_explorer_subagent,
                            user_query=user_query,
                            validated_messages=validated_messages,
                            available_tools=self._tools.allowed_specs(self._tool_permission),
                            route_decision=route_decision,
                            matched_tools=matched_tools,
                            serialize_protocol_event=self._serialize_protocol_event,
                            trace_id=trace_id,
                        )
                        for explorer_event in explorer_context.events:
                            yield explorer_event
                        if explorer_context.used:
                            model_messages = PromptBuilder.assemble_messages(
                                model_messages,
                                dynamic_prompts=[explorer_context.dynamic_prompt],
                            )
                            async for delta_event in stream_legacy_llm_data(
                                self._provider,
                                model_messages,
                                answer_buffer,
                                self._serialize_protocol_event,
                                trace_id,
                            ):
                                yield delta_event
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

                force_fetch_url = resolve_force_fetch_url(
                    matched_tools=matched_tools,
                    user_query=user_query,
                )
                if force_fetch_url:
                    async for force_fetch_event in stream_legacy_force_fetch_response(
                        force_fetch_url=force_fetch_url,
                        model_messages=model_messages,
                        tool_executor=tool_executor,
                        provider=self._provider,
                        answer_buffer=answer_buffer,
                        serialize_protocol_event=self._serialize_protocol_event,
                        trace_id=trace_id,
                        debug_stream=self._debug_stream,
                        logger=logger,
                    ):
                        yield force_fetch_event
                    return

                tool_events = self._provider.stream_chat_with_tools(
                    model_messages,
                    tools,
                    tool_executor,
                    max_tool_calls=1,
                    max_tool_retries=3,
                    on_tool_result=on_tool_result if deferred_specs and len(tools) > DEFER_THRESHOLD else None,
                )
                async for tool_chat_event in stream_legacy_tool_chat_events(
                    tool_events,
                    answer_buffer,
                    self._serialize_protocol_event,
                    trace_id,
                ):
                    yield tool_chat_event
            else:
                async for plain_event in stream_legacy_plain_chat(
                    provider=self._provider,
                    model_messages=model_messages,
                    answer_buffer=answer_buffer,
                    serialize_protocol_event=self._serialize_protocol_event,
                    trace_id=trace_id,
                ):
                    yield plain_event

            answer = answer_buffer.answer
            if self._debug_stream:
                logger.info(
                    "debug_stream python done: deltas=%s, answer_preview=%s",
                    answer_buffer.delta_count,
                    answer_buffer.debug_preview,
                )
            if memory_enabled and answer:
                await self._memory_context_support.flush_answer(
                    user_id=user_id,
                    session_id=session_id,
                    user_query=user_query,
                    answer=answer,
                    validated_messages=validated_messages,
                )

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
                    message=STREAM_ERROR_MESSAGE,
                    retryable=True,
                ):
                    yield terminal_event
            except Exception as send_error_exc:
                logger.warning("Failed to send stream error event: %s", send_error_exc)
                return

    def get_graph_health(self) -> dict:
        return build_stream_health(
            use_langgraph=self._use_langgraph,
            enable_tool_use=self._enable_tool_use,
            debug_stream=self._debug_stream,
            enabled_tools=self._enabled_tools,
            tools=self._tools,
            memory_orchestrator=self._memory_orchestrator,
            llm_extractor=self._llm_extractor,
            compaction_stats=self._compaction_support.last_stats,
            graph_health=self._graph_runner.health_snapshot(),
            action_score=self._last_action_score,
        )
