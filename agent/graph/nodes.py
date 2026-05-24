from __future__ import annotations

import json
import logging

from agents.task_planner.TaskPlannerSubAgent import TaskPlannerSubAgent
from json_types import JsonObject
from llm.chat_message import ChatMessage
from prompt.PromptBuilder import PromptBuilder
from safety.regex_filter import StreamingRegexFilter
from safety.safety_pipeline import SafetyPipeline
from tools.intent_router import emit_route_observation

from .helpers import (
    _build_plan_reasoning,
    _build_route_reasoning,
    _extract_first_url,
    _inject_fusion_context,
    _parse_skill_names,
    _prefer_rag_only,
    _run_fusion_pipeline,
    _should_force_education_rag,
    _strip_surrogates,
    provider_stream,
)
from .runtime import _emit, _execute_tool, _runtime
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
<<<<<<< HEAD
    web_search_subagent: Any = None
=======
    trace_id: str = ""
    turn_id: str = ""
>>>>>>> 1cfd0c3 (chore(flyway): 对齐V11/V12历史并新增V14审计描述迁移)


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
            "trace_id": state.get("trace_id"),
            "turn_id": state.get("turn_id"),
            "permission_config": runtime.tool_permission,
        },
    )


def _should_use_direct_plan(task_plan: JsonObject | None) -> bool:
    return (
        bool(task_plan)
        and isinstance(task_plan, dict)
        and str(task_plan.get("mode", "")).strip().lower() == "direct"
    )


def _select_tools_for_plan(tools: list, task_plan: JsonObject | None) -> list:
    if not task_plan or not isinstance(task_plan, dict):
        return tools
    return TaskPlannerSubAgent.prioritize_tools(tools, task_plan)


def _filter_tool_result(
    tool_name: str, payload: JsonObject, pipeline: SafetyPipeline | None
) -> tuple[JsonObject, int]:
    """过滤工具结果中的敏感信息

    Returns:
        tuple: (过滤后的payload, 检测到的敏感信息数量)
    """
    if pipeline is None:
        return payload, 0

    sensitive_count = 0
    result = dict(payload)

    # 过滤 message 字段
    if "message" in result and isinstance(result["message"], str):
        safety_result = pipeline.filter_text(result["message"])
        if safety_result.has_sensitive:
            result["message"] = safety_result.redacted
            sensitive_count += len(safety_result.regex_matches)
            if safety_result.privacy_result:
                sensitive_count += len(safety_result.privacy_result.spans)

    # 过滤 items 中的文本内容
    if "items" in result and isinstance(result["items"], list):
        filtered_items = []
        for item in result["items"]:
            if isinstance(item, dict) and item.get("type") == "text":
                text = item.get("text", "")
                if isinstance(text, str):
                    safety_result = pipeline.filter_text(text)
                    if safety_result.has_sensitive:
                        filtered_items.append({"type": "text", "text": safety_result.redacted})
                        sensitive_count += len(safety_result.regex_matches)
                        if safety_result.privacy_result:
                            sensitive_count += len(safety_result.privacy_result.spans)
                    else:
                        filtered_items.append(item)
                else:
                    filtered_items.append(item)
            else:
                filtered_items.append(item)
        result["items"] = filtered_items

    return result, sensitive_count


def _derive_tool_result(tool_name: str, payload: JsonObject) -> JsonObject:
    if tool_name not in {"rag_search", "web_search"}:
        return {}
    items = payload.get("items", [])
    if not isinstance(items, list) or not items:
        return {}
    sources = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        doc_name = item.get("docName") or item.get("title") or ""
        snippet = item.get("snippet") or item.get("content") or ""
        sources.append(
            {
                "id": item.get("id") or index + 1,
                "docName": doc_name,
                "snippet": snippet,
                "score": item.get("score"),
            }
        )
    return {"sources": sources} if sources else {}


def _build_tool_result_payload(
    tool_name: str,
    base_payload: JsonObject,
    payload: JsonObject,
) -> JsonObject:
    result_payload = {
        **base_payload,
        "output": payload,
        "items": payload.get("items", []),
    }
    derived = _derive_tool_result(tool_name, payload)
    if derived:
        result_payload["derived"] = derived
    return result_payload


def _planned_tool_steps(task_plan: JsonObject | None) -> list[JsonObject]:
    if not task_plan or not isinstance(task_plan, dict):
        return []
    raw_steps = task_plan.get("steps", [])
    if not isinstance(raw_steps, list):
        return []
    steps: list[JsonObject] = []
    for raw_step in raw_steps:
        if not isinstance(raw_step, dict):
            continue
        if str(raw_step.get("action", "")).strip().lower() != "call_tool":
            continue
        tool_name = str(raw_step.get("tool_name", "")).strip()
        if not tool_name:
            continue
        arguments = raw_step.get("arguments", {})
        if not isinstance(arguments, dict):
            arguments = {}
        steps.append(
            {
                "tool_name": tool_name,
                "arguments": arguments,
                "reason": str(raw_step.get("reason", "")).strip(),
            }
        )
    return steps


def _build_planned_tool_context(observations: list[JsonObject]) -> ChatMessage:
    return ChatMessage(
        role="system",
        content=(
            "以下是后端按任务计划顺序执行工具后得到的证据。"
            "请基于这些证据和当前对话回答；如果证据不足，请说明缺口。\n"
            f"{json.dumps(observations, ensure_ascii=False, default=str)[:6000]}"
        ),
    )


async def _execute_planned_tool_steps(
    *,
    state: GraphState,
    task_plan: JsonObject | None,
    pipeline: SafetyPipeline | None,
) -> list[JsonObject]:
    runtime = _runtime()
    observations: list[JsonObject] = []
    for index, step in enumerate(_planned_tool_steps(task_plan), start=1):
        tool_name = str(step.get("tool_name", "")).strip()
        tool = runtime.tools.get(tool_name)
        if tool is None:
            observations.append(
                {
                    "tool_name": tool_name,
                    "status": "error",
                    "message": "planned tool is not available",
                    "items": [],
                }
            )
            break
        arguments = step.get("arguments", {})
        if not isinstance(arguments, dict):
            arguments = {}
        tool_call_id = f"plan-{index}-{tool_name}"
        await _emit(
            "tool_use",
            {
                "tool_name": tool_name,
                "tool_call_id": tool_call_id,
                "input": arguments,
            },
        )
        raw_output = await _execute_tool(tool_name=tool_name, tool_args=arguments, state=state)
        try:
            payload = json.loads(raw_output) if raw_output else {}
        except Exception:
            logger.warning("planned tool output parse failed: tool=%s, output=%s", tool_name, raw_output[:200])
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
        status = str(payload.get("status", "error") or "error")
        base_payload = {
            "tool_name": tool_name,
            "tool_call_id": tool_call_id,
            "attempt": index,
            "status": status,
            "message": payload.get("message", "tool execute failed"),
        }
        ok = bool(payload.get("ok"))
        if ok:
            filtered_payload, _ = _filter_tool_result(tool_name, payload, pipeline)
            await _emit(
                "tool_result",
                _build_tool_result_payload(tool_name, base_payload, filtered_payload),
            )
            payload = filtered_payload
        else:
            await _emit(
                "tool_error",
                {
                    **base_payload,
                    "code": status,
                    "retryable": False,
                },
            )
        items = payload.get("items", [])
        if not isinstance(items, list):
            items = []
        observations.append(
            {
                "tool_name": tool_name,
                "status": status,
                "message": str(payload.get("message", "") or ""),
                "items": items,
            }
        )
        if not ok:
            break
    return observations


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


async def decide_tool_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    user_query = _strip_surrogates(state.get("user_query", ""))
    has_query = bool(user_query)
    rag_enabled = has_query
    education_domain = _should_force_education_rag(user_query) and runtime.tools.get("rag_search") is not None
    route_categories: set[str] = set()
    matched_tools: list[str] = []
    if runtime.enable_tool_use and has_query:
        if runtime.intent_router is not None:
            all_cats = runtime.tools.all_categories()
            route_decision = await runtime.intent_router.route_decision(
                user_query,
                all_cats,
                provider=runtime.provider,
            )
            route_categories = set(route_decision.categories)
            matched_tools = list(route_decision.matched_tools) if route_decision.matched_tools else []
            await emit_route_observation(
                route_decision,
                logger=logger,
                scope="graph",
                session_id=state.get("session_id"),
                emit=_emit,
            )
            await _emit(
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
            route_categories = runtime.tools.all_categories()
    if (
        _prefer_rag_only(user_query)
        and not matched_tools
        and runtime.tools.get("rag_search") is not None
    ):
        route_categories = {"retrieval"}
    web_search_enabled = "search" in route_categories and runtime.tools.get("web_search") is not None
    use_tool = runtime.enable_tool_use and has_query and bool(route_categories)
    task_plan: JsonObject = {}
    task_planner_subagent = getattr(runtime, "task_planner_subagent", None)
    if use_tool and task_planner_subagent is not None:
        try:
            await _emit(
                "sys_reasoning",
                {
                    "stage": "delegate",
                    "agent_name": "task_planner_subagent",
                    "message": "委托任务规划器生成更清晰的执行计划。",
                },
            )
            task_plan = await task_planner_subagent.plan(
                user_query=user_query,
                recent_messages=list(state.get("messages", [])),
                available_tools=runtime.tools.specs(),
                route_context={
                    "categories": sorted(route_categories),
                    "matched_tools": matched_tools,
                    "education_domain": education_domain,
                    "preferred_tools": ["rag_search"] if education_domain else [],
                    "web_search_enabled": web_search_enabled,
                },
            )
            await _emit("sys_tool_plan", task_plan)
            await _emit(
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
        "use_tool=%s, route_categories=%s",
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


async def call_rag_tool_node(state: GraphState) -> GraphState:
    runtime = _runtime()
    logger.info(
        "graph_node call_rag_tool: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, kb_id=%s",
        runtime.trace_id,
        runtime.turn_id,
        state.get("session_id"),
        state.get("user_id"),
        state.get("kb_id"),
    )
    try:
        payload = await runtime.tools.execute(
            "rag_search",
            {"query": state.get("user_query", ""), "top_k": 5},
            {
                "user_id": state.get("user_id"),
                "session_id": state.get("session_id"),
                "kb_id": state.get("kb_id"),
                "user_query": state.get("user_query", ""),
                "trace_id": state.get("trace_id"),
                "turn_id": state.get("turn_id"),
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
    answer_parts: list[str] = []
    debug_preview_parts: list[str] = []
    debug_chars = 0
    debug_count = 0
    llm_chunk_count = 0

    # 安全过滤：用于实时过滤流式输出和工具结果
    streaming_filter: StreamingRegexFilter | None = None
    safety_regex_matches = 0
    if runtime.safety_pipeline is not None:
        streaming_filter = runtime.safety_pipeline.create_streaming_filter()

    try:
        use_tool = bool(state.get("use_tool")) and not _should_use_direct_plan(task_plan)
        if use_tool:
            user_query = _strip_surrogates(state.get("user_query", ""))
            force_fetch_url = ""
            if "web_fetch" in (state.get("matched_tools", []) or []):
                force_fetch_url = _extract_first_url(user_query)

            direct_generate = False
            fusion_context = await _run_fusion_pipeline(state, user_query, model_messages)
            if fusion_context:
                model_messages = _inject_fusion_context(model_messages, fusion_context)
            direct_generate = bool(fusion_context and fusion_context.get("candidates"))

            route_categories = set(state.get("route_categories", set()))
            matched_tools = state.get("matched_tools", [])

            # 如果已有明确匹配的 MCP 工具，优先使用
            if matched_tools:
                tools = runtime.tools.specs_by_names(matched_tools)
            elif route_categories:
                tools = runtime.tools.specs_by_categories(route_categories)
            else:
                tools = runtime.tools.specs()
            if task_plan and isinstance(task_plan, dict):
                tools = _select_tools_for_plan(runtime.tools.specs(), task_plan)
            else:
                tools = _select_tools_for_plan(tools, task_plan)

            # 只有在没有匹配特定工具时才考虑 RAG 优先
            # 避免 RAG 优先逻辑覆盖已经正确路由的 MCP 工具
            if _prefer_rag_only(user_query) and not matched_tools:
                rag_tool = runtime.tools.get("rag_search")
                if rag_tool is not None:
                    tools = [rag_tool.to_tool_spec()]

            planned_observations = await _execute_planned_tool_steps(
                state=state,
                task_plan=task_plan,
                pipeline=runtime.safety_pipeline,
            )
            if planned_observations:
                model_messages = [_build_planned_tool_context(planned_observations)] + model_messages
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

            # URL is a hard signal: if route matched web_fetch and URL exists, force one fetch first.
            if force_fetch_url and not planned_observations and runtime.tools.get("web_fetch") is not None:
                logger.info(
                    "graph_node force_web_fetch: session_id=%s, user_id=%s, url=%s",
                    state.get("session_id"),
                    state.get("user_id"),
                    force_fetch_url[:200],
                )
                await _emit(
                    "tool_use",
                    {
                        "tool_name": "web_fetch",
                        "tool_call_id": "web_fetch-1",
                        "input": {"url": force_fetch_url, "max_content_length": 4000},
                    },
                )
                forced_output = await _execute_tool(
                    tool_name="web_fetch",
                    tool_args={"url": force_fetch_url, "max_content_length": 4000},
                    state=state,
                )
                try:
                    forced_payload = json.loads(forced_output) if forced_output else {}
                except Exception:
                    forced_payload = {}
                forced_status = str(forced_payload.get("status", "error") or "error")
                forced_base_payload = {
                    "tool_name": "web_fetch",
                    "tool_call_id": "web_fetch-1",
                    "attempt": 1,
                    "status": forced_status,
                    "message": forced_payload.get("message", "tool execute failed"),
                }
                if forced_payload.get("ok"):
                    await _emit(
                        "tool_result",
                        _build_tool_result_payload("web_fetch", forced_base_payload, forced_payload),
                    )
                    forced_items = forced_payload.get("items")
                    has_items = isinstance(forced_items, list) and bool(forced_items)
                    if forced_status == "hit" and has_items:
                        first_item = forced_items[0] if isinstance(forced_items[0], dict) else {}
                        content = str(first_item.get("content", "") or first_item.get("snippet", "") or "")
                        if content:
                            fetch_context = ChatMessage(
                                role="system",
                                content=(
                                    "已获取用户给定 URL 的页面内容，请优先基于该内容回答；"
                                    "若内容不完整再明确说明缺失点。\n\n"
                                    f"URL: {force_fetch_url}\n"
                                    f"内容摘录:\n{content[:4000]}"
                                ),
                            )
                            model_messages = [fetch_context] + model_messages
                            direct_generate = True
                else:
                    await _emit(
                        "tool_error",
                        {
                            **forced_base_payload,
                            "code": forced_status,
                            "retryable": False,
                        },
                    )

            if direct_generate:
                async for delta in runtime.provider.stream_chat(model_messages):
                    llm_chunk_count += 1
                    # 实时过滤流式输出中的敏感信息
                    if streaming_filter is not None:
                        filtered_delta = streaming_filter.process_chunk(delta)
                        if filtered_delta:
                            answer_parts.append(filtered_delta)
                            await _emit("llm_delta", {"text": filtered_delta})
                            if filtered_delta:
                                safety_regex_matches += len(streaming_filter._filter.scan(filtered_delta))
                    else:
                        answer_parts.append(delta)
                        await _emit("llm_delta", {"text": delta})

                    if runtime.debug_stream and debug_chars < _DEBUG_PREVIEW_LIMIT:
                        remain = _DEBUG_PREVIEW_LIMIT - debug_chars
                        piece = delta[:remain]
                        if piece:
                            debug_preview_parts.append(piece)
                            debug_chars += len(piece)
                    if runtime.debug_stream:
                        debug_count += 1
            else:
                async def tool_executor(tool_name: str, tool_args: JsonObject) -> str:
                    return await _execute_tool(tool_name=tool_name, tool_args=tool_args, state=state)

                async for event in runtime.provider.stream_chat_with_tools(
                    model_messages,
                    tools,
                    tool_executor,
                    max_tool_calls=1,
                    max_tool_retries=3,
                ):
                    if event.type == "tool_call":
                        await _emit(
                            "tool_use",
                            {
                                "tool_name": event.tool_name,
                                "tool_call_id": f"{event.tool_name}-{event.attempt or 1}",
                                "input": event.tool_args or {},
                            },
                        )
                        continue
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
                        base_payload = {
                            "tool_name": event.tool_name,
                            "tool_call_id": f"{event.tool_name}-{event.attempt or 1}",
                            "attempt": event.attempt,
                            "status": payload.get("status", "error"),
                            "message": payload.get("message", "tool execute failed"),
                        }
                        if event.success:
                            # 过滤工具结果中的敏感信息
                            filtered_payload, sensitive_count = _filter_tool_result(
                                event.tool_name, payload, runtime.safety_pipeline
                            )
                            safety_regex_matches += sensitive_count
                            await _emit(
                                "tool_result",
                                _build_tool_result_payload(
                                    event.tool_name,
                                    base_payload,
                                    filtered_payload,
                                ),
                            )
                        else:
                            await _emit(
                                "tool_error",
                                {
                                    **base_payload,
                                    "code": payload.get("status", "error"),
                                    "retryable": False,
                                },
                            )
                        continue

                    if event.type != "delta" or not event.text:
                        continue
                    delta = event.text
                    llm_chunk_count += 1
                    # 实时过滤流式输出中的敏感信息
                    if streaming_filter is not None:
                        filtered_delta = streaming_filter.process_chunk(delta)
                        if filtered_delta:
                            answer_parts.append(filtered_delta)
                            await _emit("llm_delta", {"text": filtered_delta})
                            if filtered_delta:
                                safety_regex_matches += len(streaming_filter._filter.scan(filtered_delta))
                    else:
                        answer_parts.append(delta)
                        await _emit("llm_delta", {"text": delta})

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
                # 实时过滤流式输出中的敏感信息
                if streaming_filter is not None:
                    filtered_delta = streaming_filter.process_chunk(delta)
                    if filtered_delta:
                        answer_parts.append(filtered_delta)
                        await _emit("llm_delta", {"text": filtered_delta})
                        if filtered_delta:
                            safety_regex_matches += len(streaming_filter._filter.scan(filtered_delta))
                else:
                    answer_parts.append(delta)
                    await _emit("llm_delta", {"text": delta})

                if runtime.debug_stream and debug_chars < _DEBUG_PREVIEW_LIMIT:
                    remain = _DEBUG_PREVIEW_LIMIT - debug_chars
                    piece = delta[:remain]
                    if piece:
                        debug_preview_parts.append(piece)
                        debug_chars += len(piece)
                if runtime.debug_stream:
                    debug_count += 1

        # 流式过滤完成后，flush 缓冲区中的剩余内容
        if streaming_filter is not None:
            flushed = streaming_filter.flush()
            if flushed:
                answer_parts.append(flushed)
                safety_regex_matches += len(streaming_filter._filter.scan(flushed))

        raw_answer = "".join(answer_parts).strip()
        final_answer = raw_answer
        if raw_answer and runtime.safety_pipeline is not None:
            safety_result = runtime.safety_pipeline.filter_text(raw_answer)
            if safety_result.has_sensitive:
                final_answer = safety_result.redacted
            # 合并流式过滤和最终过滤的结果
            total_regex_matches = safety_regex_matches + len(safety_result.regex_matches)
            total_privacy_spans = len(safety_result.privacy_result.spans) if safety_result.privacy_result else 0
            if total_regex_matches > 0 or total_privacy_spans > 0:
                await _emit("safety_warning", {
                    "regex_matches": total_regex_matches,
                    "privacy_spans": total_privacy_spans,
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
        await _emit(
            "sys_error",
            {"code": "internal_error", "message": _STREAM_ERROR_MESSAGE, "retryable": True},
        )
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
    """Pre-run read-only tools and scene detection in parallel, then run fusion pipeline."""
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

    # 涓夎矾骞惰锛歊AG 妫€绱?+ Web 鎼滅储 + 鍦烘櫙璇嗗埆
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
                        "source": item.get("source", "knowledge_base"),
                        "type": item.get("type", "general"),
                        "authority": item.get("authority", "secondary"),
                        "effective_date": item.get("effective_date", ""),
                    },
                )
                for item in items
                if item.get("text") or item.get("snippet")
            ]
        except Exception:
            logger.debug("fusion: rag_search pre-execution failed, skip", exc_info=True)
            return []

    async def _exec_web() -> list[SourceCandidate]:
        try:
            if runtime.web_search_subagent is not None:
                search_result = await runtime.web_search_subagent.search(user_query, max_results=3)
                if not search_result.safe:
                    logger.warning("fusion: web_search result unsafe, filtered: %s", search_result.filtered_reason)
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
            logger.debug("fusion: web_search pre-execution failed, skip", exc_info=True)
            return []

    async def _detect_scene() -> str:
        try:
            from prompt.PromptBuilder import PromptBuilder

            scene_prompt = PromptBuilder.build_scene_detection_prompt(user_query)
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
            logger.debug("fusion: scene detection failed, downgrade to general", exc_info=True)
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

    # 妫€鏌ユ槸鍚︽湁鍐茬獊鎻愮ず
    conflict_hint = ranked[0].metadata.get("_conflict_hint") if ranked else None

    return {
        "candidates": ranked,
        "scene": scene,
        "conflict_hint": conflict_hint,
    }


def _inject_fusion_context(model_messages: list, fusion_context: dict[str, Any]) -> list:
    """Inject fused retrieval context into model_messages as a system prompt."""
    from llm.chat_message import ChatMessage
    from prompt.PromptBuilder import PromptBuilder

    candidates = fusion_context.get("candidates", [])
    if not candidates:
        return model_messages

    # 鏋勫缓铻嶅悎缁撴灉鎻愮ず
    rag_parts = []
    web_parts = []
    for c in candidates:
        entry = f"- {c.content}"
        meta = c.metadata
        if meta.get("authority") == "official":
            entry += " [official]"
        if meta.get("effective_date"):
            entry += f" [鏃ユ湡: {meta['effective_date']}]"

        if c.source == "rag":
            rag_parts.append(entry)
        elif c.source == "web":
            web_parts.append(entry)

    lines = ["浠ヤ笅鏄婧愭绱㈢粨鏋滐紝渚涗綘鍙傝€冿細"]
    if rag_parts:
        lines.append("\n【知识库检索结果】")
        lines.extend(rag_parts)
    if web_parts:
        lines.append("\n【网络搜索结果】")
        lines.extend(web_parts)

    fusion_prompt = "\n".join(lines)

    # 娉ㄥ叆鍐茬獊鎻愮ず
    conflict_hint = fusion_context.get("conflict_hint")
    if conflict_hint:
        fusion_prompt += "\n\n" + PromptBuilder.build_conflict_hint_prompt(conflict_hint)

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
