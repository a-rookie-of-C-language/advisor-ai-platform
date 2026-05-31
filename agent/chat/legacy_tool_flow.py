"""Legacy 工具流编排：explorer 分支 + 工具执行 + force_fetch/tool_chat 分支。"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import AsyncIterator, Callable, Awaitable

from agents.tool_explorer import ToolExplorerSubAgent
from chat.ChatStreamAnswerBuffer import ChatStreamAnswerBuffer
from chat.legacy_force_fetch import resolve_force_fetch_url
from chat.legacy_force_fetch_flow import stream_legacy_force_fetch_response
from chat.legacy_llm_delta_stream import stream_legacy_llm_data
from chat.legacy_tool_chat_flow import stream_legacy_tool_chat_events
from chat.legacy_tool_explorer_flow import prepare_legacy_tool_explorer_context
from chat.legacy_tool_route_flow import LegacyToolRouteContext
from chat.stream_tool_support import ChatStreamToolSupport
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from prompt.PromptBuilder import PromptBuilder
from tools.permissions.tool_permission import ToolPermission
from tools.registry.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)

SerializeFn = Callable[..., str]
ToolExecutorFn = Callable[[str, dict], Awaitable[str]]


@dataclass
class LegacyToolFlowContext:
    """工具流执行结果。"""

    events: list[str]
    used: bool = False


async def stream_legacy_tool_flow(
    *,
    route_context: LegacyToolRouteContext,
    model_messages: list[ChatMessage],
    provider: BaseLLMProvider,
    tool_support: ChatStreamToolSupport,
    tool_explorer_subagent: ToolExplorerSubAgent | None,
    tools_registry: ToolRegistry,
    tool_permission: ToolPermission,
    answer_buffer: ChatStreamAnswerBuffer,
    serialize_protocol_event: SerializeFn,
    trace_id: str | None,
    user_id: int | None,
    session_id: int | None,
    user_query: str,
    validated_messages: list[ChatMessage],
    debug_stream: bool,
    logger_: logging.Logger | None = None,
) -> AsyncIterator[str]:
    """编排 legacy 工具流：explorer → force_fetch → tool_chat。"""

    log = logger_ or logger
    matched_tools = route_context.matched_tools
    tools = route_context.tools
    exploration_query = route_context.exploration_query
    route_decision = route_context.route_decision

    # 1. Explorer 分支
    if exploration_query and tool_explorer_subagent is not None:
        try:
            explorer_context = await prepare_legacy_tool_explorer_context(
                exploration_query=exploration_query,
                tool_explorer_subagent=tool_explorer_subagent,
                user_query=user_query,
                validated_messages=validated_messages,
                available_tools=tools_registry.allowed_specs(tool_permission),
                route_decision=route_decision,
                matched_tools=matched_tools,
                serialize_protocol_event=serialize_protocol_event,
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
                    provider,
                    model_messages,
                    answer_buffer,
                    serialize_protocol_event,
                    trace_id,
                ):
                    yield delta_event
                yield serialize_protocol_event(
                    event="sys_done",
                    source="system",
                    trace_id=trace_id,
                    payload={"finish_reason": "stream_finished"},
                )
                return
        except Exception as exc:  # noqa: BLE001
            log.warning("tool_explorer failed, fallback to legacy tool flow: %s", exc)

    # 2. 工具执行器
    async def tool_executor(tool_name: str, tool_args: dict, **kwargs) -> str:
        return await tool_support.execute_tool(
            tool_name=tool_name,
            tool_args=tool_args,
            user_id=user_id,
            session_id=session_id,
            user_query=user_query,
            trace_id=trace_id,
            turn_id=None,
            idempotency_key=kwargs.get("idempotency_key"),
        )

    # 3. Force fetch 分支
    force_fetch_url = resolve_force_fetch_url(
        matched_tools=matched_tools,
        user_query=user_query,
    )
    if force_fetch_url:
        async for force_fetch_event in stream_legacy_force_fetch_response(
            force_fetch_url=force_fetch_url,
            model_messages=model_messages,
            tool_executor=tool_executor,
            provider=provider,
            answer_buffer=answer_buffer,
            serialize_protocol_event=serialize_protocol_event,
            trace_id=trace_id,
            debug_stream=debug_stream,
            logger=log,
        ):
            yield force_fetch_event
        return

    # 4. 普通工具调用分支
    tool_events = provider.stream_chat_with_tools(
        model_messages,
        tools,
        tool_executor,
        max_tool_calls=1,
        max_tool_retries=3,
    )
    async for tool_chat_event in stream_legacy_tool_chat_events(
        tool_events,
        answer_buffer,
        serialize_protocol_event,
        trace_id,
    ):
        yield tool_chat_event
