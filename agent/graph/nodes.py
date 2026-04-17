from __future__ import annotations

import asyncio
import json
import logging
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

from llm.base_provider import ChatMessage
from memory.pipeline.work_memory import WorkMemory

from .state import GraphState

logger = logging.getLogger(__name__)

_DEBUG_PREVIEW_LIMIT = 200
_runtime_var: ContextVar["GraphRuntime"] = ContextVar("graph_runtime")


@dataclass
class GraphRuntime:
    queue: asyncio.Queue[dict[str, Any]]
    provider: Any
    memory_orchestrator: Any
    work_memory: WorkMemory
    llm_extractor: Any
    tools: Any
    enable_tool_use: bool
    debug_stream: bool


def set_runtime(runtime: GraphRuntime):
    return _runtime_var.set(runtime)


def reset_runtime(token) -> None:
    _runtime_var.reset(token)


def _runtime() -> GraphRuntime:
    return _runtime_var.get()


async def _emit(event: str, data: dict[str, Any]) -> None:
    await _runtime().queue.put({"event": event, "data": data})


async def load_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    messages = list(state.get("messages", []))
    model_messages = list(messages)
    user_query = state.get("user_query", "")
    memory_enabled = bool(
        runtime.memory_orchestrator is not None
        and state.get("user_id") is not None
        and state.get("session_id") is not None
        and state.get("kb_id") is not None
        and user_query
    )

    if memory_enabled:
        try:
            context = await runtime.memory_orchestrator.load(
                user_id=state.get("user_id"),
                session_id=state.get("session_id"),
                kb_id=state.get("kb_id"),
                query=user_query,
                recent_messages=[{"role": item.role, "content": item.content} for item in messages],
            )
            memory_prompt = runtime.work_memory.render_for_prompt(context)
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
                "Memory load failed, degrade to no-memory mode: user_id=%s, session_id=%s, kb_id=%s, error=%s",
                state.get("user_id"),
                state.get("session_id"),
                state.get("kb_id"),
                exc,
            )

    return {
        "model_messages": model_messages,
        "memory_enabled": memory_enabled,
    }


async def decide_tool_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    tools = runtime.tools.specs()
    kb_id = state.get("kb_id")
    user_query = state.get("user_query", "")
    rag_enabled = bool(tools) and kb_id is not None and kb_id >= 0 and bool(user_query)
    use_tool = rag_enabled and runtime.enable_tool_use
    return {
        "rag_enabled": rag_enabled,
        "use_tool": use_tool,
    }


async def call_rag_tool_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    try:
        payload = await runtime.tools.execute(
            "rag_search",
            {"query": state.get("user_query", ""), "top_k": 5},
            {
                "user_id": state.get("user_id"),
                "session_id": state.get("session_id"),
                "kb_id": state.get("kb_id"),
                "user_query": state.get("user_query", ""),
            },
        )
        parsed = json.loads(payload) if payload else {}
    except Exception as exc:  # noqa: BLE001
        parsed = {
            "status": "error",
            "message": f"tool_execute_failed: {exc}",
            "items": [],
        }

    await _emit(
        "sources",
        {
            "tool": "rag_search",
            "success": parsed.get("status") != "error",
            "attempt": 1,
            "status": parsed.get("status", "error"),
            "message": parsed.get("message", "tool execute failed"),
            "items": parsed.get("items", []),
        },
    )
    model_messages = list(state.get("model_messages", state.get("messages", [])))
    items = parsed.get("items", []) if isinstance(parsed, dict) else []
    if items:
        snippets = []
        for item in items[:5]:
            doc_name = item.get("docName") or item.get("doc_name") or "doc"
            snippet = item.get("snippet") or ""
            snippets.append(f"[{doc_name}] {snippet}")
        if snippets:
            model_messages = model_messages + [
                ChatMessage(
                    role="system",
                    content=(
                        "You have retrieved context from rag_search. "
                        "Use it only when relevant and do not fabricate citations.\n"
                        + "\n".join(snippets)
                    ),
                )
            ]
    return {"model_messages": model_messages}


async def generate_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    model_messages = list(state.get("model_messages", state.get("messages", [])))
    answer_parts: list[str] = []
    debug_preview_parts: list[str] = []
    debug_chars = 0
    debug_count = 0

    async for delta in runtime.provider.stream_chat(model_messages):
        answer_parts.append(delta)
        await _emit("delta", {"text": delta})

        if runtime.debug_stream and debug_chars < _DEBUG_PREVIEW_LIMIT:
            remain = _DEBUG_PREVIEW_LIMIT - debug_chars
            piece = delta[:remain]
            if piece:
                debug_preview_parts.append(piece)
                debug_chars += len(piece)
        if runtime.debug_stream:
            debug_count += 1

    return {
        "assistant_answer": "".join(answer_parts).strip(),
        "debug_delta_count": debug_count,
        "debug_preview": "".join(debug_preview_parts),
    }


async def flush_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    answer = state.get("assistant_answer", "").strip()
    if not state.get("memory_enabled") or not answer or runtime.memory_orchestrator is None:
        return {}

    try:
        messages = list(state.get("messages", []))
        await runtime.memory_orchestrator.flush(
            user_id=state.get("user_id"),
            session_id=state.get("session_id"),
            kb_id=state.get("kb_id"),
            user_text=state.get("user_query", ""),
            assistant_text=answer,
            recent_messages=[{"role": item.role, "content": item.content} for item in messages]
            + [{"role": "assistant", "content": answer}],
            llm_extractor=runtime.llm_extractor,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Memory flush failed, skip writeback: %s", exc)
    return {}


async def finalize_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    if runtime.debug_stream:
        logger.info(
            "debug_stream python done: deltas=%s, answer_preview=%s",
            state.get("debug_delta_count", 0),
            state.get("debug_preview", ""),
        )
    return {}
