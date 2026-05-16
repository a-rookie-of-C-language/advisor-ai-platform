from __future__ import annotations

import asyncio
import json
import logging
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

from llm.chat_message import ChatMessage
from prompt.QueryEngine import QueryEngine
from tools.intent_router import emit_route_observation

from .state import GraphState

logger = logging.getLogger(__name__)

_DEBUG_PREVIEW_LIMIT = 200
_STREAM_ERROR_MESSAGE = "服务内部错误，请稍后重试"
_RAG_PRIORITY_HINTS = {"知识库", "资料", "文档", "根据", "出处", "辅导员", "学生"}
_REALTIME_HINTS = {"天气", "实时", "今天", "明天", "新闻", "股价", "汇率", "比分"}
_runtime_var: ContextVar["GraphRuntime"] = ContextVar("graph_runtime")


def _strip_surrogates(text: str) -> str:
    if not text:
        return text
    return "".join(ch for ch in text if not (0xD800 <= ord(ch) <= 0xDFFF))


def _prefer_rag_only(query: str) -> bool:
    normalized = _strip_surrogates(query).strip().lower()
    if not normalized:
        return False
    has_rag_hint = any(key in normalized for key in _RAG_PRIORITY_HINTS)
    has_realtime_hint = any(key in normalized for key in _REALTIME_HINTS)
    return has_rag_hint and not has_realtime_hint


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
    trace_id: str = ""
    turn_id: str = ""
    skill_registry: Any = None
    intent_router: Any = None
    safety_pipeline: Any = None
    fusion_pipeline: Any = None
    web_search_subagent: Any = None


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
            "kb_id": 0,
            "user_query": state.get("user_query", ""),
            "permission_config": runtime.tool_permission,
        },
    )


async def select_skill_node(state: GraphState) -> GraphState:
    """Use LLM to autonomously select which skills to activate for this query."""
    runtime = _runtime()
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
    selection_prompt = QueryEngine.build_skill_selection_prompt(catalog, user_query)

    try:
        selection_messages = [ChatMessage(role="user", content=selection_prompt)]
        response_text = ""
        async for chunk in provider_stream(
            runtime.provider,
            selection_messages,
            response_format={"type": "json_object"},
        ):
            response_text += chunk

        known_names = [s.name for s in all_skills]
        selected_names = _parse_skill_names(response_text, known_names)
        active_skills = [n for n in selected_names if skill_registry.get(n) is not None]

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


def _parse_skill_names(text: str, known_names: list[str] | None = None) -> list[str]:
    """Extract skill names from LLM response (expects JSON array).

    Fallback: if JSON parsing fails, try to match known skill names from plain text.
    """
    import re

    # 优先：尝试提取 JSON 数组
    match = re.search(r"\[.*?\]", text, re.DOTALL)
    if match:
        try:
            names = json.loads(match.group())
            if isinstance(names, list):
                return [str(n) for n in names if isinstance(n, str)]
        except json.JSONDecodeError:
            pass

    # 兜底：从纯文本中匹配已知 skill name
    if known_names:
        lower_text = text.lower()
        return [name for name in known_names if name.lower() in lower_text]
    return []


async def provider_stream(
    provider: Any,
    messages: list[ChatMessage],
    *,
    response_format: dict[str, Any] | None = None,
):
    """Simple streaming wrapper for LLM text generation (no tools)."""
    async for chunk in provider.stream_chat(messages, response_format=response_format):
        yield chunk


async def load_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
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
                dynamic_prompts.append(QueryEngine.build_memory_context_prompt(memory_prompt))
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Memory load failed, degrade to no-memory mode: user_id=%s, session_id=%s, error=%s",
                state.get("user_id"),
                state.get("session_id"),
                exc,
            )

    model_messages = QueryEngine.assemble_messages(
        list(messages),
        skill_prompts=skill_prompts,
        dynamic_prompts=dynamic_prompts,
    )
    return {
        "model_messages": model_messages,
        "memory_enabled": memory_enabled,
    }


async def decide_tool_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    user_query = _strip_surrogates(state.get("user_query", ""))
    has_query = bool(user_query)
    rag_enabled = has_query
    route_categories: set[str] = set()
    if runtime.enable_tool_use and has_query:
        if runtime.intent_router is not None:
            all_cats = runtime.tools.all_categories()
            route_decision = await runtime.intent_router.route_decision(
                user_query,
                all_cats,
                provider=runtime.provider,
            )
            route_categories = set(route_decision.categories)
            await emit_route_observation(
                route_decision,
                logger=logger,
                scope="graph",
                session_id=state.get("session_id"),
                emit=_emit,
            )
        else:
            route_categories = runtime.tools.all_categories()
    if _prefer_rag_only(user_query) and runtime.tools.get("rag_search") is not None:
        route_categories = {"retrieval"}
    web_search_enabled = "search" in route_categories and runtime.tools.get("web_search") is not None
    use_tool = runtime.enable_tool_use and has_query and bool(route_categories)
    logger.info(
        "graph_node decide_tool: session_id=%s, rag_enabled=%s, web_search_enabled=%s, use_tool=%s, route_categories=%s",
        state.get("session_id"),
        rag_enabled,
        web_search_enabled,
        use_tool,
        sorted(route_categories),
    )
    return {
        "rag_enabled": rag_enabled,
        "web_search_enabled": web_search_enabled,
        "use_tool": use_tool,
        "route_categories": route_categories,
    }


async def generate_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    logger.info(
        "graph_node generate: session_id=%s, use_tool=%s",
        state.get("session_id"),
        state.get("use_tool"),
    )
    model_messages = list(state.get("model_messages", state.get("messages", [])))
    answer_parts: list[str] = []
    debug_preview_parts: list[str] = []
    debug_chars = 0
    debug_count = 0
    llm_chunk_count = 0

    try:
        if state.get("use_tool"):
            user_query = _strip_surrogates(state.get("user_query", ""))

            # 跨源融合：预执行只读工具 + 场景识别（三路并行）
            fusion_context = await _run_fusion_pipeline(state, user_query, model_messages)
            if fusion_context:
                model_messages = _inject_fusion_context(model_messages, fusion_context)
            direct_generate = bool(fusion_context and fusion_context.get("candidates"))

            route_categories = set(state.get("route_categories", set()))
            if route_categories:
                tools = runtime.tools.specs_by_categories(route_categories)
            else:
                tools = runtime.tools.specs()
            if _prefer_rag_only(user_query):
                rag_tool = runtime.tools.get("rag_search")
                if rag_tool is not None:
                    tools = [rag_tool.to_tool_spec()]
            logger.info(
                "graph_node generate tools: session_id=%s, tools=%s, route_categories=%s, direct_generate=%s",
                state.get("session_id"),
                [tool.name for tool in tools],
                sorted(route_categories),
                direct_generate,
            )

            if direct_generate:
                async for delta in runtime.provider.stream_chat(model_messages):
                    llm_chunk_count += 1
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
                            logger.warning(
                                "tool_output parse failed: tool=%s, output=%s",
                                event.tool_name,
                                (event.tool_output or "")[:200],
                            )
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
                    llm_chunk_count += 1
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
                llm_chunk_count += 1
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

        # 生成完成后：统一安全过滤
        raw_answer = "".join(answer_parts).strip()
        final_answer = raw_answer
        if raw_answer and runtime.safety_pipeline is not None:
            safety_result = runtime.safety_pipeline.filter_text(raw_answer)
            if safety_result.has_sensitive:
                final_answer = safety_result.redacted
                await _emit("safety_warning", {
                    "regex_matches": len(safety_result.regex_matches),
                    "privacy_spans": len(safety_result.privacy_result.spans) if safety_result.privacy_result else 0,
                })
        logger.info(
            "graph_node generate done: session_id=%s, llm_chunks=%s, answer_len=%s",
            state.get("session_id"),
            llm_chunk_count,
            len(final_answer),
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "graph_node generate failed: session_id=%s, user_id=%s",
            state.get("session_id"),
            state.get("user_id"),
        )
        await _emit("error", {"message": _STREAM_ERROR_MESSAGE})
        return {
            "assistant_answer": "".join(answer_parts).strip(),
            "stream_failed": True,
            "debug_delta_count": debug_count,
            "debug_preview": "".join(debug_preview_parts),
            "llm_chunk_count": llm_chunk_count,
        }

    return {
        "assistant_answer": final_answer,
        "stream_failed": False,
        "debug_delta_count": debug_count,
        "debug_preview": "".join(debug_preview_parts),
        "llm_chunk_count": llm_chunk_count,
    }


async def _run_fusion_pipeline(
    state: GraphState,
    user_query: str,
    model_messages: list,
) -> dict[str, Any] | None:
    """预执行只读工具 + 场景识别（三路并行），然后走融合 pipeline。"""
    from fusion.source_candidate import SourceCandidate

    runtime = _runtime()
    if runtime.fusion_pipeline is None:
        return None
    context = {
        "user_id": state.get("user_id"),
        "session_id": state.get("session_id"),
        "kb_id": 0,
        "user_query": user_query,
        "permission_config": runtime.tool_permission,
    }

    # 三路并行：RAG 检索 + Web 搜索 + 场景识别
    async def _exec_rag() -> list[SourceCandidate]:
        try:
            result = await runtime.tools.execute("rag_search", {"query": user_query, "top_k": 5}, context)
            payload = json.loads(result) if isinstance(result, str) else {}
            items = payload.get("items", []) if isinstance(payload, dict) else []
            return [
                SourceCandidate(
                    content=item.get("text", item.get("snippet", "")),
                    source="rag",
                    score=item.get("score", 1.0),
                    metadata={
                        "source": item.get("source", "知识库"),
                        "type": item.get("type", "general"),
                        "authority": item.get("authority", "secondary"),
                        "effective_date": item.get("effective_date", ""),
                    },
                )
                for item in items
                if item.get("text") or item.get("snippet")
            ]
        except Exception:
            logger.debug("fusion: rag_search 预执行失败，跳过", exc_info=True)
            return []

    async def _exec_web() -> list[SourceCandidate]:
        try:
            if runtime.web_search_subagent is not None:
                search_result = await runtime.web_search_subagent.search(user_query, max_results=3)
                if not search_result.safe:
                    logger.warning("fusion: web_search 结果不合规，已过滤: %s", search_result.filtered_reason)
                    return []
                if not search_result.sources:
                    return []
                return [
                    SourceCandidate(
                        content=search_result.summary,
                        source="web",
                        metadata={
                            "source": "web",
                            "title": src.get("title", ""),
                            "url": src.get("url", ""),
                            "key_facts": search_result.key_facts,
                        },
                    )
                    for src in search_result.sources
                    if src.get("snippet")
                ]
            result = await runtime.tools.execute("web_search", {"query": user_query, "max_results": 3}, context)
            payload = json.loads(result) if isinstance(result, str) else {}
            items = payload.get("items", []) if isinstance(payload, dict) else []
            return [
                SourceCandidate(
                    content=item.get("snippet", ""),
                    source="web",
                    metadata={"source": "web", "title": item.get("title", ""), "url": item.get("url", "")},
                )
                for item in items
                if item.get("snippet")
            ]
        except Exception:
            logger.debug("fusion: web_search 预执行失败，跳过", exc_info=True)
            return []

    async def _detect_scene() -> str:
        try:
            from prompt.QueryEngine import QueryEngine

            scene_prompt = QueryEngine.build_scene_detection_prompt(user_query)
            scene_messages = [ChatMessage(role="user", content=scene_prompt)]
            response_text = ""
            async for chunk in provider_stream(
                runtime.provider,
                scene_messages,
                response_format={"type": "json_object"},
            ):
                response_text += chunk
            scene_data = json.loads(response_text)
            scene = scene_data.get("scene", "general")
            logger.info("fusion: scene detected=%s, confidence=%s", scene, scene_data.get("confidence"))
            return scene
        except Exception:
            logger.debug("fusion: 场景识别失败，降级为 general", exc_info=True)
            return "general"

    rag_results, web_results, scene = await asyncio.gather(
        _exec_rag(),
        _exec_web(),
        _detect_scene(),
    )

    if not rag_results and not web_results:
        return None

    candidates = rag_results + web_results
    ranked = list(candidates)
    for strategy in runtime.fusion_pipeline.get_enabled_ordered():
        ranked = strategy.rank(ranked, user_query, scene)

    # 检查是否有冲突提示
    conflict_hint = ranked[0].metadata.get("_conflict_hint") if ranked else None

    return {
        "candidates": ranked,
        "scene": scene,
        "conflict_hint": conflict_hint,
    }


def _inject_fusion_context(model_messages: list, fusion_context: dict[str, Any]) -> list:
    """将融合结果注入 model_messages 作为 system 提示。"""
    from llm.chat_message import ChatMessage
    from prompt.QueryEngine import QueryEngine

    candidates = fusion_context.get("candidates", [])
    if not candidates:
        return model_messages

    # 构建融合结果提示
    rag_parts = []
    web_parts = []
    for c in candidates:
        entry = f"- {c.content}"
        meta = c.metadata
        if meta.get("authority") == "official":
            entry += " [官方来源]"
        if meta.get("effective_date"):
            entry += f" [日期: {meta['effective_date']}]"

        if c.source == "rag":
            rag_parts.append(entry)
        elif c.source == "web":
            web_parts.append(entry)

    lines = ["以下是多源检索结果，供你参考："]
    if rag_parts:
        lines.append("\n【知识库检索结果】")
        lines.extend(rag_parts)
    if web_parts:
        lines.append("\n【网络搜索结果】")
        lines.extend(web_parts)

    fusion_prompt = "\n".join(lines)

    # 注入冲突提示
    conflict_hint = fusion_context.get("conflict_hint")
    if conflict_hint:
        fusion_prompt += "\n\n" + QueryEngine.build_conflict_hint_prompt(conflict_hint)

    system_msg = ChatMessage(role="system", content=fusion_prompt)
    return [system_msg] + model_messages


async def flush_memory_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    logger.info(
        "graph_node flush_memory: session_id=%s, memory_enabled=%s",
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
            kb_id=0,
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
        "graph_node finalize: session_id=%s, answer_len=%s",
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
