from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from agents.task_planner.TaskPlannerSubAgent import TaskPlannerSubAgent
from json_types import JsonObject
from prompt.PromptBuilder import PromptBuilder

from .force_web_fetch import execute_forced_web_fetch
from .fusion_context_flow import inject_fusion_context, run_fusion_pipeline
from .generation_tool_selection import select_generation_tools
from .GraphStreamAccumulator import GraphStreamAccumulator
from .helpers import _extract_first_url, _strip_surrogates
from .planned_tools import (
    build_planned_tool_context,
    execute_planned_tool_steps,
    should_use_direct_plan,
)
from .state import GraphState
from .tool_stream_adapter import emit_graph_tool_stream_event

_STREAM_ERROR_MESSAGE = "服务内部错误，请稍后重试"


async def run_generate_node(
    *,
    state: GraphState,
    runtime: Any,
    emit: Callable[[str, dict[str, Any]], Awaitable[None]],
    execute_tool: Callable[..., Awaitable[str]],
    logger: logging.Logger,
) -> GraphState:
    logger.info(
        "graph_node generate: session_id=%s, use_tool=%s",
        state.get("session_id"),
        state.get("use_tool"),
    )
    model_messages = list(state.get("model_messages", state.get("messages", [])))
    task_plan = state.get("task_plan", {})
    if task_plan and isinstance(task_plan, dict):
        model_messages = PromptBuilder.assemble_messages(
            model_messages,
            dynamic_prompts=[TaskPlannerSubAgent.render_plan_prompt(task_plan)],
        )
    stream_output = GraphStreamAccumulator(
        safety_pipeline=runtime.safety_pipeline,
        debug_stream=runtime.debug_stream,
        emit=emit,
    )

    try:
        use_tool = bool(state.get("use_tool")) and not should_use_direct_plan(task_plan)
        if use_tool:
            user_query = _strip_surrogates(state.get("user_query", ""))
            force_fetch_url = ""
            if "web_fetch" in (state.get("matched_tools", []) or []):
                force_fetch_url = _extract_first_url(user_query)

            fusion_context = None
            direct_generate = False

            tools, route_categories, matched_tools = select_generation_tools(
                runtime=runtime,
                state=state,
                task_plan=task_plan,
                user_query=user_query,
            )
            
            # 只在没有可用工具时才运行 fusion pipeline
            # 如果有可用工具，应该让 LLM 自主决定是否调用
            if not tools:
                fusion_context = await run_fusion_pipeline(state, user_query, model_messages)
                if fusion_context:
                    model_messages = inject_fusion_context(model_messages, fusion_context)
                direct_generate = bool(fusion_context and fusion_context.get("candidates"))

            planned_observations = await execute_planned_tool_steps(
                state=state,
                task_plan=task_plan,
                pipeline=runtime.safety_pipeline,
            )
            if planned_observations:
                model_messages = [build_planned_tool_context(planned_observations)] + model_messages
                direct_generate = True

            logger.info(
                "graph_node generate tools: session_id=%s, tools=%s, route_categories=%s, "
                "matched_tools=%s, direct_generate=%s",
                state.get("session_id"),
                [tool.name for tool in tools],
                sorted(route_categories),
                matched_tools,
                direct_generate,
            )

            if force_fetch_url and not planned_observations and runtime.tools.get("web_fetch") is not None:
                logger.info(
                    "graph_node force_web_fetch: session_id=%s, user_id=%s, url=%s",
                    state.get("session_id"),
                    state.get("user_id"),
                    force_fetch_url[:200],
                )
                fetch_context = await execute_forced_web_fetch(
                    state=state,
                    force_fetch_url=force_fetch_url,
                    emit=emit,
                    execute_tool=execute_tool,
                )
                if fetch_context is not None:
                    model_messages = [fetch_context] + model_messages
                    direct_generate = True

            if direct_generate:
                async for delta in runtime.provider.stream_chat(model_messages):
                    await stream_output.append_delta(delta)
            else:

                async def tool_executor(tool_name: str, tool_args: JsonObject) -> str:
                    return await execute_tool(tool_name=tool_name, tool_args=tool_args, state=state)

                async for event in runtime.provider.stream_chat_with_tools(
                    model_messages,
                    tools,
                    tool_executor,
                    max_tool_calls=1,
                    max_tool_retries=3,
                ):
                    if await emit_graph_tool_stream_event(
                        event,
                        emit=emit,
                        pipeline=runtime.safety_pipeline,
                        add_sensitive_count=stream_output.add_sensitive_count,
                    ):
                        continue

                    if event.type != "delta" or not event.text:
                        continue
                    await stream_output.append_delta(event.text)
        else:
            async for delta in runtime.provider.stream_chat(model_messages):
                await stream_output.append_delta(delta)

        await stream_output.flush()
        final_answer = await stream_output.final_answer()
        logger.info(
            "graph_node generate done: session_id=%s, llm_chunks=%s, answer_len=%s",
            state.get("session_id"),
            stream_output.llm_chunk_count,
            len(final_answer),
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "graph_node generate failed: session_id=%s, user_id=%s",
            state.get("session_id"),
            state.get("user_id"),
        )
        await emit(
            "sys_error",
            {"code": "internal_error", "message": _STREAM_ERROR_MESSAGE, "retryable": True},
        )
        return stream_output.state(assistant_answer=stream_output.answer, stream_failed=True)

    return stream_output.state(assistant_answer=final_answer, stream_failed=False)
