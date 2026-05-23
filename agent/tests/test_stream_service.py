from __future__ import annotations

import json
from types import SimpleNamespace
from typing import AsyncIterator, Iterable

import pytest

from agents.tool_explorer import ToolExplorerEvent, ToolExplorerOutcome
from chat.stream_service import ChatStreamService
from context.memory.core.schema import MemoryContext
from json_types import JsonValue
from llm import openai_provider as openai_provider_module
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.tool_spec import ToolSpec


def _parse_event(raw: str) -> tuple[str, dict]:
    # Handle both escaped \\n and actual \n newlines
    normalized = raw.replace("\\n", "\n")
    lines = [line for line in normalized.strip().split("\n") if line]
    event = "message"
    payload = {}
    for line in lines:
        if line.startswith("event:"):
            event = line.split(":", 1)[1].strip()
        if line.startswith("data:"):
            payload = json.loads(line.split(":", 1)[1].strip())
    if isinstance(payload.get("payload"), dict):
        payload = payload["payload"]
    return event, payload


def _parse_event_name(raw: str) -> str:
    # Handle both escaped \\n and actual \n newlines
    normalized = raw.replace("\\n", "\n")
    for line in normalized.split("\n"):
        line = line.strip()
        if line.startswith("event:"):
            return line.split(":", 1)[1].strip()
    return "message"


def _assert_search_route_payload(payload: dict) -> None:
    assert payload["matched_by"] == "fallback"
    assert payload["categories"] == ["retrieval"]
    assert payload["source"]["decision"] == payload["matched_by"]
    assert payload["source"]["categories"] == payload["categories"]


class _ProviderOk:
    def __init__(self, chunks: list[str]) -> None:
        self._chunks = chunks
        self.last_messages: list[ChatMessage] = []

    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        self.last_messages = list(messages)
        for chunk in self._chunks:
            yield chunk

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        for chunk in self._chunks:
            yield LLMStreamEvent(type="delta", text=chunk)


class _ProviderError:
    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        if False:
            yield ""
        raise RuntimeError("provider boom")

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        raise RuntimeError("provider boom")


class _ProviderToolUse:
    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        if False:
            yield ""
        return

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tools
        _ = max_tool_calls
        _ = max_tool_retries
        payload = await tool_executor("rag_search", {"query": "q", "top_k": 3})
        yield LLMStreamEvent(type="tool_result", tool_name="rag_search", tool_output=payload, attempt=1, success=True)
        yield LLMStreamEvent(type="delta", text="answer")


class _ProviderLegacyToolUse:
    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        if False:
            yield ""
        return

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tools
        _ = max_tool_calls
        _ = max_tool_retries
        payload = await tool_executor("rag_search", {"query": "q", "top_k": 3})
        yield LLMStreamEvent(type="tool_result", tool_name="rag_search", tool_output=payload, attempt=1, success=True)
        yield LLMStreamEvent(type="delta", text="answer")


class _ProviderRouteCapture:
    def __init__(self) -> None:
        self.last_tools: list[ToolSpec] = []

    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        if False:
            yield ""
        return

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tool_executor
        _ = max_tool_calls
        _ = max_tool_retries
        _ = kwargs
        self.last_tools = list(tools)
        yield LLMStreamEvent(type="delta", text="answer")


class _ProviderRouteJsonThenAnswer:
    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        if kwargs.get("response_format"):
            yield json.dumps({"categories": [], "confidence": 0.0, "reason": "fallback"})
            return
        yield "这些学生包括张三、李四。"

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tools
        _ = tool_executor
        _ = max_tool_calls
        _ = max_tool_retries
        _ = kwargs
        yield LLMStreamEvent(type="delta", text="should not use main tool loop")


class _CapturingOpenAIProvider:
    instances: list["_CapturingOpenAIProvider"] = []

    def __init__(
        self,
        api_key,
        model,
        base_url=None,
        temperature=0.2,
        timeout=60.0,
        max_retries=0,
        stream_timeout_sec=45.0,
        tool_round_timeout_sec=30.0,
        stream_idle_timeout_sec=90.0,
        thinking_config=None,
    ) -> None:
        self.kwargs = {
            "api_key": api_key,
            "model": model,
            "base_url": base_url,
            "temperature": temperature,
            "timeout": timeout,
            "max_retries": max_retries,
            "stream_timeout_sec": stream_timeout_sec,
            "tool_round_timeout_sec": tool_round_timeout_sec,
            "stream_idle_timeout_sec": stream_idle_timeout_sec,
            "thinking_config": thinking_config,
        }
        self.model = model
        _CapturingOpenAIProvider.instances.append(self)

    async def stream_chat(self, messages: Iterable[ChatMessage], **kwargs: JsonValue) -> AsyncIterator[str]:
        _ = messages
        _ = kwargs
        if False:
            yield ""


class _ExplorerUsed:
    async def explore(self, **kwargs: JsonValue) -> ToolExplorerOutcome:
        _ = kwargs
        return ToolExplorerOutcome(
            used=True,
            sufficient=True,
            summary="已查询学生名单。",
            evidence=[{"tool_name": "mcp__student__list_students", "items": [{"text": "张三、李四"}]}],
            tool_calls=[{"tool_name": "mcp__student__list_students", "arguments": {}}],
            events=[
                ToolExplorerEvent(
                    event="sys_tool_plan",
                    payload={
                        "step": 1,
                        "action": "call_tool",
                        "tool_name": "mcp__student__list_students",
                        "tool_call_id": "tool_explorer-1-mcp__student__list_students",
                        "arguments": {},
                        "reason": "追问学生名单",
                    },
                ),
                ToolExplorerEvent(
                    event="tool_use",
                    payload={
                        "tool_name": "mcp__student__list_students",
                        "tool_call_id": "tool_explorer-1-mcp__student__list_students",
                        "input": {},
                    },
                ),
                ToolExplorerEvent(
                    event="tool_result",
                    payload={
                        "tool_name": "mcp__student__list_students",
                        "tool_call_id": "tool_explorer-1-mcp__student__list_students",
                        "attempt": 1,
                        "status": "success",
                        "message": "共 2 条记录",
                        "output": {
                            "ok": True,
                            "status": "success",
                            "message": "共 2 条记录",
                            "items": [{"type": "text", "text": "张三、李四"}],
                        },
                    },
                ),
            ],
        )


class _RagMiss:
    def rag_search(self, req):
        _ = req

        class _Res:
            ok = True
            items = []

        return _Res()


class _RagHit:
    def rag_search(self, req):
        _ = req

        class _Res:
            ok = True
            items = [
                SimpleNamespace(
                    doc_id=1,
                    doc_title="高校辅导员素质能力提升",
                    text="辅导员能力建设应围绕思想政治、学生管理、心理辅导和就业指导展开。",
                    score=0.98,
                )
            ]

        return _Res()


class _RagMustNotRun:
    def rag_search(self, req):
        _ = req
        raise AssertionError("rag_search should not run without permission context")


class _MemoryOkFlushError:
    def __init__(self) -> None:
        self.load_called = 0
        self.flush_called = 0

    async def load(self, **kwargs) -> MemoryContext:
        self.load_called += 1
        return MemoryContext()

    async def flush(self, **kwargs) -> None:
        self.flush_called += 1
        raise RuntimeError("flush failed")


class _MemoryLoadError:
    def __init__(self) -> None:
        self.load_called = 0
        self.flush_called = 0

    async def load(self, **kwargs) -> MemoryContext:
        self.load_called += 1
        raise RuntimeError("load failed")

    async def flush(self, **kwargs) -> None:
        self.flush_called += 1


@pytest.mark.asyncio
async def test_subagent_model_overrides_fall_back_to_main_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TOOL_EXPLORER_MODEL", raising=False)
    monkeypatch.delenv("CONTEXT_COMPACTION_MODEL", raising=False)
    monkeypatch.delenv("WEB_SEARCH_MODEL", raising=False)
    monkeypatch.delenv("WEB_FETCH_MODEL", raising=False)

    provider = _ProviderOk(["ok"])
    service = ChatStreamService(provider=provider, memory_orchestrator=None, rag_service=None)

    assert service._build_tool_explorer_provider() is provider
    assert service._build_context_compaction_provider() is provider
    assert service._build_web_search_provider() is provider
    assert service._build_web_fetch_provider() is provider


@pytest.mark.asyncio
async def test_subagent_model_overrides_use_env_specific_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    _CapturingOpenAIProvider.instances.clear()
    monkeypatch.setenv("TOOL_EXPLORER_MODEL", "tool-explorer-model")
    monkeypatch.setenv("TOOL_EXPLORER_API_KEY", "tool-explorer-key")
    monkeypatch.setenv("TOOL_EXPLORER_BASE_URL", "http://tool-explorer.local")
    monkeypatch.setenv("CONTEXT_COMPACTION_MODEL", "context-compaction-model")
    monkeypatch.setenv("CONTEXT_COMPACTION_API_KEY", "context-compaction-key")
    monkeypatch.setenv("CONTEXT_COMPACTION_BASE_URL", "http://context-compaction.local")
    monkeypatch.setenv("WEB_SEARCH_MODEL", "web-search-model")
    monkeypatch.setenv("WEB_SEARCH_API_KEY", "web-search-key")
    monkeypatch.setenv("WEB_SEARCH_BASE_URL", "http://web-search.local")
    monkeypatch.setenv("WEB_FETCH_MODEL", "web-fetch-model")
    monkeypatch.setenv("WEB_FETCH_API_KEY", "web-fetch-key")
    monkeypatch.setenv("WEB_FETCH_BASE_URL", "http://web-fetch.local")
    monkeypatch.setattr(openai_provider_module, "OpenAIProvider", _CapturingOpenAIProvider)

    provider = _ProviderOk(["ok"])
    service = ChatStreamService(provider=provider, memory_orchestrator=None, rag_service=None)

    built_providers = [
        service._build_tool_explorer_provider(),
        service._build_context_compaction_provider(),
        service._build_web_search_provider(),
        service._build_web_fetch_provider(),
    ]

    assert [item.kwargs["model"] for item in built_providers] == [
        "tool-explorer-model",
        "context-compaction-model",
        "web-search-model",
        "web-fetch-model",
    ]
    assert [item.kwargs["api_key"] for item in built_providers] == [
        "tool-explorer-key",
        "context-compaction-key",
        "web-search-key",
        "web-fetch-key",
    ]


@pytest.mark.asyncio
async def test_stream_success_done_and_flush_failure_not_interrupt() -> None:
    provider = _ProviderOk(["hello", " world"])
    memory = _MemoryOkFlushError()
    service = ChatStreamService(provider=provider, memory_orchestrator=memory)

    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=0)]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {"sys_start", "llm_data", "sys_done"}
    assert memory.load_called >= 1  # 可能被调用多次（fallback 机制）
    assert memory.flush_called >= 1  # 可能被调用多次（fallback 机制）


@pytest.mark.asyncio
async def test_stream_memory_load_failure_degrades_without_breaking_chat() -> None:
    provider = _ProviderOk(["ok"])
    memory = _MemoryLoadError()
    service = ChatStreamService(provider=provider, memory_orchestrator=memory)

    messages = [ChatMessage(role="user", content="question")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=0)]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {"sys_start", "llm_data", "sys_done"}
    assert memory.load_called >= 1  # 可能被调用多次（fallback 机制）
    assert memory.flush_called >= 1  # 可能被调用多次（fallback 机制）
    # 注：由于 fallback 机制，provider.last_messages 可能包含多次调用的历史


@pytest.mark.asyncio
async def test_stream_provider_error_emits_error_then_done() -> None:
    service = ChatStreamService(provider=_ProviderError(), memory_orchestrator=None)

    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages)]
    parsed = [_parse_event(event) for event in events]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {"sys_start", "sys_error", "sys_done"}
    error_payload = next((p for e, p in parsed if e == "sys_error"), None)
    assert error_payload is not None
    assert error_payload.get("message") == "服务内部错误，请稍后重试"


@pytest.mark.asyncio
async def test_legacy_stream_tool_route_prefers_search_for_latest_query(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FEATURE_WEB_SEARCH", "true")
    provider = _ProviderRouteCapture()
    service = ChatStreamService(
        provider=provider,
        memory_orchestrator=None,
        rag_service=_RagMiss(),
    )
    service._use_langgraph = False
    messages = [
        ChatMessage(
            role="user",
            content="".join(
                chr(c)
                for c in [0x5e2e, 0x6211, 0x67e5, 0x4e00, 0x4e0b, 0x6700, 0x65b0, 0x653f, 0x7b56, 0x6d88, 0x606f]
            ),
        )
    ]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {"sys_start", "sys_intent_route", "llm_data", "sys_done"}
    route_payload = next((p for e, p in parsed if e == "sys_intent_route"), None)
    assert route_payload is not None
    _assert_search_route_payload(route_payload)
    assert {tool.name for tool in provider.last_tools} == {"rag_search"}


@pytest.mark.asyncio
async def test_stream_tool_route_prefers_search_for_latest_query(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FEATURE_WEB_SEARCH", "true")
    provider = _ProviderRouteCapture()
    service = ChatStreamService(
        provider=provider,
        memory_orchestrator=None,
        rag_service=_RagMiss(),
    )
    messages = [
        ChatMessage(
            role="user",
            content="".join(
                chr(c)
                for c in [0x5e2e, 0x6211, 0x67e5, 0x4e00, 0x4e0b, 0x6700, 0x65b0, 0x653f, 0x7b56, 0x6d88, 0x606f]
            ),
        )
    ]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {"sys_start", "sys_intent_route", "llm_data", "sys_done"}
    route_payload = next((p for e, p in parsed if e == "sys_intent_route"), None)
    assert route_payload is not None
    _assert_search_route_payload(route_payload)
    assert {tool.name for tool in provider.last_tools} == {"rag_search"}


@pytest.mark.asyncio
async def test_stream_tool_use_emits_sources_and_miss_status() -> None:
    service = ChatStreamService(
        provider=_ProviderToolUse(),
        memory_orchestrator=None,
        rag_service=_RagMiss(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {"sys_start", "sys_intent_route", "tool_result", "llm_data", "sys_done"}
    intent_route_payload = next((p for e, p in parsed if e == "sys_intent_route"), None)
    assert intent_route_payload is not None
    assert intent_route_payload.get("matched_by") in {"fallback", "strong_rule", "score", "llm"}


def test_build_tool_result_payload_derives_web_search_sources() -> None:
    service = ChatStreamService(
        provider=_ProviderOk(["ok"]),
        memory_orchestrator=None,
        rag_service=None,
    )
    payload = service._build_tool_result_payload(  # noqa: SLF001
        "web_search",
        {
            "tool_name": "web_search",
            "tool_call_id": "web_search-1",
            "attempt": 1,
            "status": "hit",
            "message": "hit",
        },
        {
            "ok": True,
            "status": "hit",
            "message": "hit",
            "items": [
                {
                    "title": "辅导员课程",
                    "snippet": "这是摘要",
                    "url": "https://example.com/course",
                    "source": "web",
                }
            ],
        },
    )

    assert payload["derived"]["sources"][0]["docName"] == "辅导员课程"
    assert payload["derived"]["sources"][0]["snippet"] == "这是摘要"


@pytest.mark.asyncio
async def test_stream_uses_planned_rag_for_education_queries() -> None:
    provider = _ProviderOk(["根据知识库内容回答。"])
    service = ChatStreamService(
        provider=provider,
        memory_orchestrator=None,
        rag_service=_RagHit(),
    )
    messages = [ChatMessage(role="user", content="高校辅导员素质能力提升怎么做？")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {
        "sys_start",
        "sys_intent_route",
        "sys_reasoning",
        "sys_tool_plan",
        "tool_use",
        "tool_result",
        "llm_data",
        "sys_done",
    }
    rag_result_payload = next((p for e, p in parsed if e == "tool_result" and p.get("tool_name") == "rag_search"), None)
    assert rag_result_payload is not None
    assert rag_result_payload.get("status") == "hit"
    assert any(msg.role == "system" and "tool explorer" in msg.content for msg in provider.last_messages)


@pytest.mark.asyncio
async def test_stream_tool_use_without_scope_returns_permission_error_and_continues() -> None:
    service = ChatStreamService(
        provider=_ProviderToolUse(),
        memory_orchestrator=None,
        rag_service=_RagMustNotRun(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [_parse_event_name(e) for e in events]

    assert event_names == ["sys_start", "sys_intent_route", "tool_result", "llm_delta", "sys_done"]
    assert parsed[1][1]["matched_by"] in {"fallback", "strong_rule", "score", "llm"}
    assert parsed[2][1]["status"] == "error"
    assert parsed[2][1]["items"] == []


@pytest.mark.asyncio
async def test_stream_follow_up_question_uses_tool_explorer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENABLED_TOOLS", raising=False)
    service = ChatStreamService(
        provider=_ProviderRouteJsonThenAnswer(),
        memory_orchestrator=None,
        rag_service=_RagMiss(),
    )
    service._use_langgraph = False
    service._tool_explorer_subagent = _ExplorerUsed()

    messages = [
        ChatMessage(role="user", content="那有多少学生?"),
        ChatMessage(role="assistant", content="现在共有 20 名学生。"),
        ChatMessage(role="user", content="具体是哪些?"),
    ]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    event_names = [_parse_event_name(e) for e in events]

    assert "sys_reasoning" in event_names
    assert "sys_tool_plan" in event_names
    assert "tool_use" in event_names
    assert "tool_result" in event_names
    assert "llm_data" in event_names


@pytest.mark.asyncio
async def test_stream_respects_enabled_tools_whitelist(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENABLED_TOOLS", "other_tool")
    service = ChatStreamService(
        provider=_ProviderOk(["fallback"]),
        memory_orchestrator=None,
        rag_service=_RagMustNotRun(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    event_names = [_parse_event_name(e) for e in events]

    assert set(event_names) >= {"sys_start", "llm_data", "sys_done"}


@pytest.mark.asyncio
async def test_stream_can_fallback_to_legacy_when_langgraph_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENABLED_TOOLS", raising=False)
    monkeypatch.setenv("USE_LANGGRAPH", "false")
    monkeypatch.setenv("FEATURE_WEB_SEARCH", "true")
    service = ChatStreamService(
        provider=_ProviderLegacyToolUse(),
        memory_orchestrator=None,
        rag_service=_RagMiss(),
    )
    messages = [ChatMessage(role="user", content="hi")]
    events = [event async for event in service.stream_events(messages, user_id=1, session_id=1001, kb_id=1)]
    parsed = [_parse_event(event) for event in events]
    event_names = [_parse_event_name(e) for e in events]

    assert event_names == ["sys_start", "sys_intent_route", "tool_result", "llm_delta", "sys_done"]
    route_payload = parsed[1][1]
    assert route_payload["matched_by"] == "fallback"
    assert route_payload["categories"] == ["retrieval"]


@pytest.mark.asyncio
async def test_graph_health_contains_context_compaction_stats() -> None:
    service = ChatStreamService(
        provider=_ProviderOk(["ok"]),
        memory_orchestrator=None,
        rag_service=None,
    )
    messages = [ChatMessage(role="user", content="hello context compaction")]
    _ = [event async for event in service.stream_events(messages)]

    health = service.get_graph_health()
    assert "context_compaction" in health
    stats = health["context_compaction"]
    assert "tokens_before" in stats
    assert "tokens_after" in stats
    assert "tokens_released" in stats
    assert "latency_ms" in stats
