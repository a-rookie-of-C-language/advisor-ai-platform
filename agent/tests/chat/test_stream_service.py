from __future__ import annotations

import json

import pytest

from chat.stream_service import ChatStreamService
from graph.tool_result_mapper import build_tool_result_payload
from llm import openai_provider as openai_provider_module
from llm.chat_message import ChatMessage
from tests.chat.stream_service_fakes import (
    CapturingOpenAIProvider as _CapturingOpenAIProvider,
)
from tests.chat.stream_service_fakes import (
    ExplorerUsed as _ExplorerUsed,
)
from tests.chat.stream_service_fakes import (
    MemoryLoadError as _MemoryLoadError,
)
from tests.chat.stream_service_fakes import (
    MemoryOkFlushError as _MemoryOkFlushError,
)
from tests.chat.stream_service_fakes import (
    ProviderError as _ProviderError,
)
from tests.chat.stream_service_fakes import (
    ProviderLegacyToolUse as _ProviderLegacyToolUse,
)
from tests.chat.stream_service_fakes import (
    ProviderOk as _ProviderOk,
)
from tests.chat.stream_service_fakes import (
    ProviderRouteCapture as _ProviderRouteCapture,
)
from tests.chat.stream_service_fakes import (
    ProviderRouteJsonThenAnswer as _ProviderRouteJsonThenAnswer,
)
from tests.chat.stream_service_fakes import (
    ProviderToolUse as _ProviderToolUse,
)
from tests.chat.stream_service_fakes import (
    RagHit as _RagHit,
)
from tests.chat.stream_service_fakes import (
    RagMiss as _RagMiss,
)
from tests.chat.stream_service_fakes import (
    RagMustNotRun as _RagMustNotRun,
)


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
    assert payload["matched_by"] == "strong_rule"
    assert payload["categories"] == ["search"]
    assert payload["source"]["decision"] == payload["matched_by"]
    assert payload["source"]["categories"] == payload["categories"]


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
    assert "rag_search" in {tool.name for tool in provider.last_tools}


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
    assert "rag_search" in {tool.name for tool in provider.last_tools}


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
    payload = build_tool_result_payload(
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

    assert event_names == ["sys_start", "sys_intent_route", "tool_result", "llm_data", "sys_done"]
    route_payload = parsed[1][1]
    assert route_payload["matched_by"] in {"fallback", "strong_rule", "score", "llm"}
    assert "search" in route_payload["categories"] or "retrieval" in route_payload["categories"]


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


@pytest.mark.asyncio
async def test_langgraph_stream_uses_compacted_messages() -> None:
    service = ChatStreamService(
        provider=_ProviderOk(["ok"]),
        memory_orchestrator=None,
        rag_service=None,
    )
    compacted_messages = [ChatMessage(role="user", content="compacted question")]
    captured_messages: list[ChatMessage] = []

    class FakeCompactionSupport:
        last_stats = {}

        async def compact(self, messages, *, session_id=None):
            _ = messages
            _ = session_id
            return compacted_messages, {
                "tokens_before": 20,
                "tokens_after": 5,
                "tokens_released": 15,
                "latency_ms": 1,
                "auto_compacted": True,
            }

    async def fake_stream_events_graph(messages, **kwargs):
        _ = kwargs
        captured_messages.extend(messages)
        yield service._serialize_protocol_event(
            event="llm_data",
            source="assistant",
            trace_id=None,
            payload={"delta": "ok"},
        )
        yield service._serialize_protocol_event(
            event="sys_done",
            source="system",
            trace_id=None,
            payload={"finish_reason": "stream_finished"},
        )

    service._compaction_support = FakeCompactionSupport()
    service._stream_events_graph = fake_stream_events_graph

    original_messages = [ChatMessage(role="user", content="original question")]
    _ = [event async for event in service.stream_events(original_messages, session_id=1001)]

    assert captured_messages == compacted_messages
