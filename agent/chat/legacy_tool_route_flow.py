from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Callable

from chat.legacy_route_support import (
    adjust_route_payload,
    build_planner_route_context,
    filter_matched_tools,
    select_route_tools,
)
from chat.legacy_subagent_events import (
    build_delegate_reasoning_payload,
    build_plan_reasoning_payload,
    build_route_reasoning_payload,
    should_emit_planning_reasoning,
)
from chat.stream_message_utils import looks_like_exploration_query
from graph.helpers import _should_force_education_rag
from json_types import JsonObject
from llm.chat_message import ChatMessage
from routing.intent_router import emit_route_observation


@dataclass
class LegacyToolRouteContext:
    route_decision: Any
    matched_tools: list[str]
    tools: list[Any]
    deferred_specs: list[Any]
    education_domain: bool
    exploration_query: bool
    task_plan: JsonObject
    events: list[str]


async def prepare_legacy_tool_route(
    *,
    user_query: str,
    validated_messages: list[ChatMessage],
    session_id: int | None,
    trace_id: str | None,
    provider: Any,
    tools_registry: Any,
    tool_permission: Any,
    intent_router: Any,
    task_planner_subagent: Any,
    serialize_protocol_event: Callable[..., str],
    logger: logging.Logger,
) -> LegacyToolRouteContext:
    events: list[str] = []
    all_cats = tools_registry.allowed_categories(tool_permission)
    route_decision = await intent_router.route_decision(
        user_query,
        all_cats,
        provider=provider,
    )
    raw_matched_tools = list(route_decision.matched_tools) if route_decision.matched_tools else []
    matched_tools = filter_matched_tools(
        raw_matched_tools,
        tools=tools_registry,
        allowed_categories=all_cats,
    )
    tools = select_route_tools(
        route_decision=route_decision,
        matched_tools=matched_tools,
        user_query=user_query,
        tools=tools_registry,
    )
    deferred_specs = [tool for tool in tools if getattr(tool, "defer_loading", False)]
    route_payload = await emit_route_observation(
        route_decision,
        logger=logger,
        scope="legacy",
        session_id=session_id,
    )
    route_payload = adjust_route_payload(
        route_payload,
        route_decision=route_decision,
        matched_tools=matched_tools,
        raw_matched_tools=raw_matched_tools,
    )
    events.append(
        serialize_protocol_event(
            event=f"sys_{route_decision.event_name}",
            source="system",
            trace_id=trace_id,
            payload=route_payload,
        )
    )
    education_domain = _should_force_education_rag(user_query) and tools_registry.get("rag_search") is not None
    exploration_query = looks_like_exploration_query(user_query, validated_messages)
    should_emit_planning = should_emit_planning_reasoning(
        education_domain=education_domain,
        exploration_query=exploration_query,
    )
    if should_emit_planning:
        events.append(
            serialize_protocol_event(
                event="sys_reasoning",
                source="system",
                trace_id=trace_id,
                payload=build_route_reasoning_payload(
                    route_decision=route_decision,
                    matched_tools=matched_tools,
                    education_domain=education_domain,
                ),
            )
        )

    task_plan: JsonObject = {}
    if should_emit_planning and task_planner_subagent is not None:
        try:
            events.append(
                serialize_protocol_event(
                    event="sys_reasoning",
                    source="system",
                    trace_id=trace_id,
                    payload=build_delegate_reasoning_payload("task_planner_subagent"),
                )
            )
            task_plan = await task_planner_subagent.plan(
                user_query=user_query,
                recent_messages=validated_messages,
                available_tools=tools_registry.allowed_specs(tool_permission),
                route_context=build_planner_route_context(
                    route_decision=route_decision,
                    matched_tools=matched_tools,
                    education_domain=education_domain,
                ),
            )
            events.append(
                serialize_protocol_event(
                    event="sys_tool_plan",
                    source="system",
                    trace_id=trace_id,
                    payload=task_plan,
                )
            )
            events.append(
                serialize_protocol_event(
                    event="sys_reasoning",
                    source="system",
                    trace_id=trace_id,
                    payload=build_plan_reasoning_payload(task_plan),
                )
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("task_planner failed, fallback to legacy tool flow: %s", exc)
            task_plan = {}

    return LegacyToolRouteContext(
        route_decision=route_decision,
        matched_tools=matched_tools,
        tools=tools,
        deferred_specs=deferred_specs,
        education_domain=education_domain,
        exploration_query=exploration_query,
        task_plan=task_plan,
        events=events,
    )
