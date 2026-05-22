from __future__ import annotations

from agent.json_types import JsonObject, JsonValue
import asyncio
import json
import logging
import re

from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage

from .runtime import _runtime
from .state import GraphState

logger = logging.getLogger(__name__)

_URL_PATTERN = re.compile(r"https?://[^\s)>\"]+")

_RAG_PRIORITY_HINTS = {"知识库", "资料", "文档", "根据", "出处", "辅导员", "学生"}
_REALTIME_HINTS = {"天气", "实时", "今天", "明天", "新闻", "股价", "汇率", "比分"}


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
        "kb_id": 0,
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
