from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from json_types import JsonObject

from .decision_support import (
    adjust_route_payload,
    allowed_tool_categories,
    allowed_tool_specs,
    build_task_plan_route_context,
    filter_matched_tools,
)
from .helpers import (
    _build_delegate_reasoning,
    _build_plan_reasoning,
    _build_route_reasoning,
    _prefer_rag_only,
    _should_force_education_rag,
    _strip_surrogates,
)
from .state import GraphState


async def decide_graph_tools(
    *,
    state: GraphState,
    runtime,
    emit: Callable[[str, dict[str, Any]], Awaitable[None]],
    route_observer: Callable[..., Any],
    logger: logging.Logger,
) -> GraphState:
    user_query = _strip_surrogates(state.get("user_query", ""))
    has_query = bool(user_query)
    rag_enabled = has_query
    education_domain = _should_force_education_rag(user_query) and runtime.tools.get("rag_search") is not None
    route_categories: set[str] = set()
    matched_tools: list[str] = []
    if runtime.enable_tool_use and has_query:
        if runtime.intent_router is not None:
            all_cats = allowed_tool_categories(runtime)
            route_decision = await runtime.intent_router.route_decision(
                user_query,
                all_cats,
                provider=runtime.provider,
            )
            route_categories = set(route_decision.categories)
            raw_matched_tools = list(route_decision.matched_tools) if route_decision.matched_tools else []
            matched_tools = filter_matched_tools(raw_matched_tools, runtime=runtime, all_categories=all_cats)
            route_payload = await route_observer(
                route_decision,
                logger=logger,
                scope="graph",
                session_id=state.get("session_id"),
            )
            route_payload = adjust_route_payload(
                route_payload,
                matched_tools=matched_tools,
                raw_matched_tools=raw_matched_tools,
            )
            await emit("intent_route", route_payload)
            if education_domain:
                await emit(
                    "sys_reasoning",
                    {
                        "stage": "route",
                        "message": _build_route_reasoning(
                            route_categories=sorted(route_categories),
                            matched_tools=matched_tools,
                            education_domain=education_domain,
                        ),
                        "categories": sorted(route_categories),
                        "matched_tools": matched_tools,
                    },
                )
        else:
            route_categories = allowed_tool_categories(runtime)
    if (
        _prefer_rag_only(user_query)
        and not matched_tools
        and runtime.tools.get("rag_search") is not None
    ):
        route_categories = {"retrieval"}
    web_search_enabled = (
        ("search" in route_categories or "retrieval" in route_categories)
        and runtime.tools.get("web_search") is not None
    )
    use_tool = runtime.enable_tool_use and has_query and bool(route_categories)
    task_plan: JsonObject = {}
    task_planner_subagent = getattr(runtime, "task_planner_subagent", None)
    if use_tool and education_domain and task_planner_subagent is not None:
        try:
            await emit(
                "sys_reasoning",
                {
                    "stage": "delegate",
                    "agent_name": "task_planner_subagent",
                    "message": _build_delegate_reasoning("task_planner_subagent"),
                },
            )
            task_plan = await task_planner_subagent.plan(
                user_query=user_query,
                recent_messages=list(state.get("messages", [])),
                available_tools=allowed_tool_specs(runtime),
                route_context=build_task_plan_route_context(
                    route_categories=route_categories,
                    matched_tools=matched_tools,
                    education_domain=education_domain,
                    web_search_enabled=web_search_enabled,
                ),
            )
            await emit("sys_tool_plan", task_plan)
            await emit(
                "sys_reasoning",
                {
                    "stage": "plan",
                    "message": _build_plan_reasoning(task_plan),
                    "mode": task_plan.get("mode", ""),
                    "summary": task_plan.get("summary", ""),
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("graph_node task_plan failed: %s", exc)
            task_plan = {}
    logger.info(
        "graph_node decide_tool: session_id=%s, rag_enabled=%s, web_search_enabled=%s, "
        "use_tool=%s, route_categories=%s, matched_tools=%s",
        state.get("session_id"),
        rag_enabled,
        web_search_enabled,
        use_tool,
        sorted(route_categories),
        matched_tools,
    )
    return {
        "rag_enabled": rag_enabled,
        "force_rag": False,
        "education_domain": education_domain,
        "web_search_enabled": web_search_enabled,
        "use_tool": use_tool,
        "route_categories": route_categories,
        "matched_tools": matched_tools,
        "task_plan": task_plan,
    }
