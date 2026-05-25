from __future__ import annotations

import asyncio
import json
import logging
import re

from json_types import JsonObject
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage

from .runtime import _runtime
from .state import GraphState

logger = logging.getLogger(__name__)

_URL_PATTERN = re.compile(r"https?://[^\s)>\"]+")

_RAG_PRIORITY_HINTS = {"知识库", "资料", "文档", "根据", "出处", "辅导员", "学生"}
_REALTIME_HINTS = {"天气", "实时", "今天", "明天", "新闻", "股价", "汇率", "比分", "最新", "现在", "目前"}


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


def _should_force_education_rag(query: str) -> bool:
    normalized = _strip_surrogates(query).strip().lower()
    if not normalized:
        return False
    if any(key in normalized for key in _REALTIME_HINTS):
        return False
    education_hints = (
        "辅导员",
        "学生",
        "学工",
        "学生工作",
        "育人",
        "资助",
        "奖助",
        "宿舍",
        "心理",
        "思政",
        "班级",
        "就业",
        "评优",
        "处分",
        "政策",
        "制度",
        "校园",
        "高校",
        "大学",
        "教育",
    )
    return any(hint in normalized for hint in education_hints)


def _build_rag_context_prompt(items: list[dict]) -> str:
    if not items:
        return ""
    lines = ["以下是知识库检索结果，请优先依据它回答："]
    for item in items:
        if not isinstance(item, dict):
            continue
        snippet = str(item.get("snippet") or item.get("text") or "").strip()
        if not snippet:
            continue
        doc_name = str(item.get("docName") or item.get("title") or "").strip()
        if doc_name:
            lines.append(f"- [{doc_name}] {snippet}")
        else:
            lines.append(f"- {snippet}")
    return "\n".join(lines)



def _build_route_reasoning(
    *,
    route_categories: list[str],
    matched_tools: list[str],
    education_domain: bool,
) -> str:
    categories = [str(item).strip() for item in route_categories if str(item).strip()]
    tools = [str(item).strip() for item in matched_tools if str(item).strip()]
    if education_domain:
        return "识别到辅导员或学生工作类问题，先走知识库检索，再根据证据决定是否补充网络信息。"
    if "retrieval" in categories and "search" in categories:
        return "问题同时涉及本地知识和外部资料，先检索知识库，再补充最新信息。"
    if "retrieval" in categories:
        return "问题更适合先查知识库，优先使用本地资料回答。"
    if "search" in categories:
        return "问题带有时效性或外部信息线索，先补充网络资料。"
    if tools:
        return f"路由命中工具 {', '.join(tools)}，将按匹配结果继续。"
    return "当前没有命中明确工具，将按通用计划继续。"


def _build_plan_reasoning(task_plan: JsonObject | None) -> str:
    if not task_plan or not isinstance(task_plan, dict):
        return "未生成任务计划，直接进入回答。"
    mode = str(task_plan.get("mode", "")).strip().lower()
    summary = str(task_plan.get("summary", "")).strip()
    raw_steps = task_plan.get("steps", [])
    tool_steps: list[str] = []
    if isinstance(raw_steps, list):
        for raw_step in raw_steps:
            if not isinstance(raw_step, dict):
                continue
            if str(raw_step.get("action", "")).strip().lower() != "call_tool":
                continue
            tool_name = str(raw_step.get("tool_name", "")).strip()
            if tool_name and tool_name not in tool_steps:
                tool_steps.append(tool_name)
    if mode == "direct":
        return summary or "计划判断无需额外工具，直接生成回答。"
    if tool_steps:
        chain = " -> ".join(tool_steps)
        return f"{summary + '：' if summary else ''}先执行 {chain}，再汇总结果。"
    return summary or "已生成执行计划，继续推进。"


def _build_delegate_reasoning(agent_name: str, purpose: str = "") -> str:
    normalized = agent_name.strip()
    if normalized == "task_planner_subagent":
        return "委托任务规划器生成更清晰的执行计划。"
    if normalized == "tool_explorer_subagent":
        return "委托工具探索器按计划补充证据，并整理可回答的依据。"
    if purpose:
        return f"委托 {normalized} 处理当前阶段任务：{purpose}"
    return f"委托 {normalized} 处理当前阶段任务。"


def _extract_first_url(text: str) -> str:
    match = _URL_PATTERN.search(text or "")
    return match.group(0) if match else ""

def _parse_skill_names(text: str, known_names: list[str] | None = None) -> list[str]:
    match = re.search(r"\[.*?\]", text, re.DOTALL)
    if match:
        try:
            names = json.loads(match.group())
            if isinstance(names, list):
                return [str(n) for n in names if isinstance(n, str)]
        except json.JSONDecodeError:
            pass
    if known_names:
        lower_text = text.lower()
        return [name for name in known_names if name.lower() in lower_text]
    return []


async def provider_stream(
    provider: BaseLLMProvider,
    messages: list[ChatMessage],
    *,
    response_format: JsonObject | None = None,
):
    async for chunk in provider.stream_chat(messages, response_format=response_format):
        yield chunk


async def _run_fusion_pipeline(
    state: GraphState,
    user_query: str,
    model_messages: list,
) -> JsonObject | None:
    from fusion.source_candidate import SourceCandidate

    runtime = _runtime()
    if runtime.fusion_pipeline is None:
        return None
    context = {
        "user_id": state.get("user_id"),
        "session_id": state.get("session_id"),
        "kb_id": state.get("kb_id"),
        "user_query": user_query,
        "permission_config": runtime.tool_permission,
    }

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
            logger.debug("fusion: rag 预执行失败，跳过", exc_info=True)
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

    conflict_hint = ranked[0].metadata.get("_conflict_hint") if ranked else None

    return {
        "candidates": ranked,
        "scene": scene,
        "conflict_hint": conflict_hint,
    }


def _inject_fusion_context(model_messages: list, fusion_context: JsonObject) -> list:
    from prompt.PromptBuilder import PromptBuilder

    candidates = fusion_context.get("candidates", [])
    if not candidates:
        return model_messages

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

    conflict_hint = fusion_context.get("conflict_hint")
    if conflict_hint:
        fusion_prompt += "\n\n" + PromptBuilder.build_conflict_hint_prompt(conflict_hint)

    system_msg = ChatMessage(role="system", content=fusion_prompt)
    return [system_msg] + model_messages
