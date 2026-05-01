from __future__ import annotations

import asyncio
import json
import logging
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

from llm.chat_message import ChatMessage

from .state import GraphState

logger = logging.getLogger(__name__)

_DEBUG_PREVIEW_LIMIT = 200
_STREAM_ERROR_MESSAGE = "服务内部错误，请稍后重试"
_runtime_var: ContextVar["GraphRuntime"] = ContextVar("graph_runtime")


@dataclass
class GraphRuntime:
    queue: asyncio.Queue[dict[str, Any]]
    provider: Any
    memory_orchestrator: Any
    memory_injector: Any
    llm_extractor: Any
    tools: Any
    tool_permission: Any
    enable_tool_use: bool
    debug_stream: bool
    trace_id: str
    turn_id: str


def set_runtime(runtime: GraphRuntime):
    return _runtime_var.set(runtime)


def reset_runtime(token) -> None:
    _runtime_var.reset(token)


def _runtime() -> GraphRuntime:
    return _runtime_var.get()


async def _emit(event: str, data: dict[str, Any]) -> None:
    await _runtime().queue.put({"event": event, "data": data})


async def _execute_tool(*, tool_name: str, tool_args: dict[str, Any], state: GraphState) -> str:
    runtime = _runtime()
    return await runtime.tools.execute(
        tool_name,
        tool_args,
        {
            "user_id": state.get("user_id"),
            "session_id": state.get("session_id"),
            "kb_id": state.get("kb_id"),
            "user_query": state.get("user_query", ""),
            "permission_config": runtime.tool_permission,
        },
    )


async def load_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    logger.info(
        "graph_node load_memory: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, kb_id=%s",
        runtime.trace_id,
        runtime.turn_id,
        state.get("session_id"),
        state.get("user_id"),
        state.get("kb_id"),
    )
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
            memory_context = await runtime.memory_orchestrator.load(
                user_id=state.get("user_id"),
                session_id=state.get("session_id"),
                kb_id=state.get("kb_id"),
                query=user_query,
                recent_messages=[{"role": item.role, "content": item.content} for item in messages],
            )
            model_context = runtime.memory_injector.build_model_context(memory_context)
            memory_prompt = model_context.render(source_filter={"memory"})
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
    logger.info(
        "graph_node decide_tool: trace_id=%s, turn_id=%s, session_id=%s, rag_enabled=%s, use_tool=%s",
        runtime.trace_id,
        runtime.turn_id,
        state.get("session_id"),
        rag_enabled,
        use_tool,
    )
    return {
        "rag_enabled": rag_enabled,
        "use_tool": use_tool,
    }


async def call_rag_tool_node(state: GraphState) -> GraphState:
    _ = state
    return {}


async def generate_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    logger.info(
        "graph_node generate: trace_id=%s, turn_id=%s, session_id=%s, use_tool=%s",
        runtime.trace_id,
        runtime.turn_id,
        state.get("session_id"),
        state.get("use_tool"),
    )
    model_messages = list(state.get("model_messages", state.get("messages", [])))
    answer_parts: list[str] = []
    debug_preview_parts: list[str] = []
    debug_chars = 0
    debug_count = 0

    try:
        if state.get("use_tool"):
            tools = runtime.tools.specs()

            async def tool_executor(tool_name: str, tool_args: dict[str, Any]) -> str:
                return await _execute_tool(tool_name=tool_name, tool_args=tool_args, state=state)

            async for event in runtime.provider.stream_chat_with_tools(
                model_messages,
                tools,
                tool_executor,
                max_tool_calls=1,
                max_tool_retries=3,
            ):
                if event.type == "tool_result":
                    try:
                        payload = json.loads(event.tool_output) if event.tool_output else {}
                    except Exception:
                        payload = {}
                    await _emit(
                        "sources",
                        {
                            "tool": event.tool_name,
                            "success": event.success,
                            "attempt": event.attempt,
                            "status": payload.get("status", "error"),
                            "message": payload.get("message", "tool execute failed"),
                            "items": payload.get("items", []),
                        },
                    )
                    continue

                if event.type != "delta" or not event.text:
                    continue
                delta = event.text
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
        else:
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
    except Exception:  # noqa: BLE001
        logger.exception(
            "graph_node generate failed: session_id=%s, user_id=%s, kb_id=%s",
            state.get("session_id"),
            state.get("user_id"),
            state.get("kb_id"),
        )
        await _emit("error", {"message": _STREAM_ERROR_MESSAGE})
        return {
            "assistant_answer": "".join(answer_parts).strip(),
            "stream_failed": True,
            "debug_delta_count": debug_count,
            "debug_preview": "".join(debug_preview_parts),
        }

    return {
        "assistant_answer": "".join(answer_parts).strip(),
        "stream_failed": False,
        "debug_delta_count": debug_count,
        "debug_preview": "".join(debug_preview_parts),
    }


async def flush_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    logger.info(
        "graph_node flush_memory: trace_id=%s, turn_id=%s, session_id=%s, memory_enabled=%s",
        runtime.trace_id,
        runtime.turn_id,
        state.get("session_id"),
        state.get("memory_enabled"),
    )
    answer = state.get("assistant_answer", "").strip()
    if state.get("stream_failed"):
        return {}
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
    logger.info(
        "graph_node finalize: trace_id=%s, turn_id=%s, session_id=%s, answer_len=%s",
        runtime.trace_id,
        runtime.turn_id,
        state.get("session_id"),
        len(state.get("assistant_answer", "")),
    )
    if runtime.debug_stream:
        logger.info(
            "debug_stream python done: deltas=%s, answer_preview=%s",
            state.get("debug_delta_count", 0),
            state.get("debug_preview", ""),
        )
    return {}
