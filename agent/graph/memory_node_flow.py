from __future__ import annotations

import logging

from prompt.PromptBuilder import PromptBuilder

from .state import GraphState


async def load_graph_memory(
    *,
    state: GraphState,
    runtime,
    logger: logging.Logger,
) -> GraphState:
    logger.info(
        "graph_node load_memory: session_id=%s, user_id=%s",
        state.get("session_id"),
        state.get("user_id"),
    )
    messages = list(state.get("messages", []))
    user_query = state.get("user_query", "")
    memory_enabled = bool(
        runtime.memory_orchestrator is not None
        and state.get("user_id") is not None
        and state.get("session_id") is not None
        and user_query
    )

    skill_prompts: list[str] = []
    skill_prompt = state.get("skill_system_prompt", "")
    if skill_prompt:
        skill_prompts.append(skill_prompt)

    dynamic_prompts: list[str] = []
    if memory_enabled:
        try:
            memory_context = await runtime.memory_orchestrator.load(
                user_id=state.get("user_id"),
                session_id=state.get("session_id"),
                kb_id=0,
                query=user_query,
                recent_messages=[{"role": item.role, "content": item.content} for item in messages],
            )
            model_context = runtime.memory_injector.build_model_context(memory_context)
            memory_prompt = model_context.render(source_filter={"memory"})
            if memory_prompt:
                dynamic_prompts.append(PromptBuilder.build_memory_context_prompt(memory_prompt))
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Memory load failed, degrade to no-memory mode: user_id=%s, session_id=%s, error=%s",
                state.get("user_id"),
                state.get("session_id"),
                exc,
            )

    model_messages = PromptBuilder.assemble_messages(
        list(messages),
        skill_prompts=skill_prompts,
        dynamic_prompts=dynamic_prompts,
    )
    return {
        "model_messages": model_messages,
        "memory_enabled": memory_enabled,
    }
