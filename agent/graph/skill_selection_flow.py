from __future__ import annotations

import logging

from llm.chat_message import ChatMessage
from prompt.PromptBuilder import PromptBuilder

from .helpers import _parse_skill_names, provider_stream
from .state import GraphState


async def select_graph_skills(
    *,
    state: GraphState,
    runtime,
    logger: logging.Logger,
) -> GraphState:
    """Use LLM to autonomously select which skills to activate for this query."""
    skill_registry = getattr(runtime, "skill_registry", None)
    if skill_registry is None:
        return {"active_skills": [], "skill_system_prompt": ""}

    all_skills = skill_registry.list_all()
    if not all_skills:
        return {"active_skills": [], "skill_system_prompt": ""}

    user_query = state.get("user_query", "").strip()
    if not user_query:
        return {"active_skills": [], "skill_system_prompt": ""}

    catalog = skill_registry.catalog_prompt()
    selection_prompt = PromptBuilder.build_skill_selection_prompt(catalog, user_query)

    try:
        selection_messages = [ChatMessage(role="user", content=selection_prompt)]
        response_text = ""
        async for chunk in provider_stream(
            runtime.provider,
            selection_messages,
            response_format={"type": "json_object"},
        ):
            response_text += chunk

        known_names = [skill.name for skill in all_skills]
        selected_names = _parse_skill_names(response_text, known_names)
        active_skills = [name for name in selected_names if skill_registry.get(name) is not None]

        if not active_skills:
            logger.info("graph_node select_skill: no skill selected for query=%s", user_query[:50])
            return {"active_skills": [], "skill_system_prompt": ""}

        prompts = []
        for name in active_skills:
            skill = skill_registry.get(name)
            if skill is not None:
                prompts.append(skill.brief)

        merged_prompt = "\n\n".join(prompts)
        logger.info(
            "graph_node select_skill: active_skills=%s, session_id=%s",
            active_skills,
            state.get("session_id"),
        )
        return {"active_skills": active_skills, "skill_system_prompt": merged_prompt}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Skill selection failed, degrade to no-skill mode: %s", exc)
        return {"active_skills": [], "skill_system_prompt": ""}
