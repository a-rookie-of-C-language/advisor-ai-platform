from __future__ import annotations

import logging

from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryItem import MemoryItem
from context.memory.core.WritebackResult import WritebackResult
from json_types import JsonObject


async def read_memory_with_policy(
    memory_client: MemoryApiClient | None,
    *,
    agent_name: str,
    allowed: bool,
    user_id: int,
    kb_id: int,
    query: str,
    top_k: int,
    logger: logging.Logger,
) -> list[MemoryItem]:
    if not allowed:
        logger.warning("agent_read_memory_denied name=%s", agent_name)
        return []
    if memory_client is None:
        return []
    try:
        return await memory_client.search_long_term(user_id=user_id, kb_id=kb_id, query=query, top_k=top_k)
    except Exception as exc:
        logger.warning("agent_read_memory_failed name=%s err=%s", agent_name, exc)
        return []


async def write_memory_with_policy(
    memory_client: MemoryApiClient | None,
    *,
    agent_name: str,
    allowed: bool,
    user_id: int,
    kb_id: int,
    candidates: list[MemoryCandidate],
    logger: logging.Logger,
) -> WritebackResult:
    if not allowed:
        logger.warning("agent_write_memory_denied name=%s", agent_name)
        return WritebackResult(accepted=0, rejected=0, message="permission_denied")
    if memory_client is None:
        return WritebackResult(accepted=0, rejected=0, message="no_memory_client")
    try:
        return await memory_client.upsert_candidates(user_id=user_id, kb_id=kb_id, candidates=candidates)
    except Exception as exc:
        logger.warning("agent_write_memory_failed name=%s err=%s", agent_name, exc)
        return WritebackResult(accepted=0, rejected=len(candidates), message=str(exc))


async def submit_memory_task_with_policy(
    memory_client: MemoryApiClient | None,
    *,
    agent_name: str,
    allowed: bool,
    user_id: int,
    kb_id: int,
    session_id: int,
    turn_id: str,
    user_text: str | None,
    assistant_text: str | None,
    recent_messages: list[dict[str, str]] | None,
    logger: logging.Logger,
) -> JsonObject:
    if not allowed:
        logger.warning("agent_submit_task_denied name=%s", agent_name)
        return {}
    if memory_client is None:
        return {}
    try:
        return await memory_client.submit_memory_task(
            user_id=user_id,
            kb_id=kb_id,
            session_id=session_id,
            turn_id=turn_id,
            user_text=user_text,
            assistant_text=assistant_text,
            recent_messages=recent_messages,
        )
    except Exception as exc:
        logger.warning("agent_submit_task_failed name=%s err=%s", agent_name, exc)
        return {}
