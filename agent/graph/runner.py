from __future__ import annotations

import asyncio
import logging
import time
from typing import AsyncIterator

from agent.json_types import JsonObject
from agents.search.web_search_subagent import WebSearchSubAgent
from context.memory.memory_injector import MemoryInjector
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from fusion.registry import SourcePriorityRegistry
from llm.base_provider import BaseLLMProvider
from safety.safety_pipeline import SafetyPipeline
from skills.skill_registry import SkillRegistry
from tools.intent_router import IntentRouter
from tools.tool_permission import PermissionConfig
from tools.tool_registry import ToolRegistry
from context.memory.pipeline.work_memory import WorkMemory
from llm.chat_message import ChatMessage

from .runtime import GraphRuntime, reset_runtime, set_runtime
from .workflow import build_chat_graph

logger = logging.getLogger(__name__)


class GraphRunner:
    def __init__(
        self,
        provider: BaseLLMProvider,
        memory_orchestrator: MemoryOrchestrator | None,
        llm_extractor,
        tools: ToolRegistry,
        tool_permission: PermissionConfig,
        *,
        debug_stream: bool,
        enable_tool_use: bool,
        skill_registry: SkillRegistry | None = None,
        intent_router: IntentRouter | None = None,
        safety_pipeline: SafetyPipeline | None = None,
        fusion_pipeline: SourcePriorityRegistry | None = None,
        web_search_subagent: WebSearchSubAgent | None = None,
    ) -> None:
        self._provider = provider
        self._memory_orchestrator = memory_orchestrator
        self._llm_extractor = llm_extractor
        self._tools = tools
        self._tool_permission = tool_permission
        self._work_memory = WorkMemory()
        self._memory_injector = MemoryInjector(self._work_memory)
        self._debug_stream = debug_stream
        self._enable_tool_use = enable_tool_use
        self._skill_registry = skill_registry
        self._intent_router = intent_router
        self._safety_pipeline = safety_pipeline
        self._fusion_pipeline = fusion_pipeline
        self._web_search_subagent = web_search_subagent
        self._compiled = build_chat_graph()
        self._node_order = [
            "select_skill",
            "load_memory",
            "decide_tool",
            "generate",
            "flush_memory",
            "finalize",
        ]

    def health_snapshot(self) -> JsonObject:
        return {
            "compiled": self._compiled is not None,
            "checkpoint": "inmemory",
            "nodes": list(self._node_order),
        }

    async def run_stream(
        self,
        *,
        messages: list[ChatMessage],
        user_query: str,
        user_id: int | None,
        session_id: int | None,
        kb_id: int | None = None,
        trace_id: str | None = None,
        turn_id: str | None = None,
    ) -> AsyncIterator[JsonObject]:
        _ = kb_id
        started_at = time.perf_counter()
        queue: asyncio.Queue[JsonObject] = asyncio.Queue()
        runtime = GraphRuntime(
            queue=queue,
            provider=self._provider,
            memory_orchestrator=self._memory_orchestrator,
            memory_injector=self._memory_injector,
            llm_extractor=self._llm_extractor,
            tools=self._tools,
            tool_permission=self._tool_permission,
            enable_tool_use=self._enable_tool_use,
            debug_stream=self._debug_stream,
            trace_id=trace_id or "",
            turn_id=turn_id or "",
            skill_registry=self._skill_registry,
            intent_router=self._intent_router,
            safety_pipeline=self._safety_pipeline,
            fusion_pipeline=self._fusion_pipeline,
            web_search_subagent=self._web_search_subagent,
        )
        state = {
            "messages": messages,
            "model_messages": messages,
            "user_id": user_id,
            "session_id": session_id,
            "user_query": user_query,
            "trace_id": trace_id,
            "turn_id": turn_id,
        }
        done = asyncio.Event()
        invoke_error: list[Exception] = []
        emitted_events = 0

        logger.info(
            "graph_run start: session_id=%s, user_id=%s, message_count=%s",
            session_id,
            user_id,
            len(messages),
        )

        async def _invoke() -> None:
            token = set_runtime(runtime)
            try:
                await self._compiled.ainvoke(state)
            except Exception as exc:  # noqa: BLE001
                invoke_error.append(exc)
            finally:
                reset_runtime(token)
                done.set()

        task = asyncio.create_task(_invoke())
        while True:
            if done.is_set() and queue.empty():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=0.1)
                emitted_events += 1
                yield event
            except asyncio.TimeoutError:
                continue

        await task
        if invoke_error:
            raise invoke_error[0]
        logger.info(
            "graph_run done: session_id=%s, user_id=%s, events=%s, elapsed_ms=%s",
            session_id,
            user_id,
            emitted_events,
            int((time.perf_counter() - started_at) * 1000),
        )
