from __future__ import annotations

import pytest

from tools.intent_router import IntentRouter


class _ProviderJson:
    def __init__(self, payload: str) -> None:
        self._payload = payload

    async def stream_chat(self, messages, **kwargs):
        _ = messages
        _ = kwargs
        yield self._payload


class _ProviderError:
    async def stream_chat(self, messages, **kwargs):
        _ = messages
        _ = kwargs
        raise RuntimeError("provider boom")
        if False:
            yield ""


class TestIntentRouter:
    @pytest.mark.asyncio
    async def test_strong_rule_hits_single_category(self) -> None:
        router = IntentRouter()
        decision = await router.route_decision(
            "请根据知识库文档回答这个问题",
            {"retrieval", "search", "memory_read", "memory_write", "meta"},
        )
        assert decision.categories == {"retrieval"}
        assert decision.matched_by == "strong_rule"
        assert decision.confidence >= 0.9

    @pytest.mark.asyncio
    async def test_llm_breaks_conflict_for_latest_document_query(self) -> None:
        router = IntentRouter()
        provider = _ProviderJson('{"categories": ["search"], "confidence": 0.92, "reason": "需要最新公开信息"}')
        decision = await router.route_decision(
            "请根据最新政策文档帮我查一下现在的要求",
            {"retrieval", "search", "memory_read", "memory_write", "meta"},
            provider=provider,
        )
        assert decision.categories == {"search"}
        assert decision.matched_by == "llm"
        assert decision.confidence == pytest.approx(0.92)

    @pytest.mark.asyncio
    async def test_fallback_prefers_read_only_categories_when_llm_fails(self) -> None:
        router = IntentRouter()
        decision = await router.route_decision(
            "这个事情你看着处理一下",
            {"retrieval", "search", "memory_read", "memory_write", "meta"},
            provider=_ProviderError(),
        )
        assert decision.matched_by == "fallback"
        assert decision.categories == {"retrieval", "search", "memory_read"}
        assert decision.fallback_reason in {"score_below_threshold", "llm_unavailable"}

    @pytest.mark.asyncio
    async def test_memory_write_rule_avoids_broad_fallback(self) -> None:
        router = IntentRouter()
        decision = await router.route_decision(
            "请帮我记住以后默认用中文回答",
            {"retrieval", "search", "memory_read", "memory_write", "meta"},
        )
        assert decision.categories == {"memory_write"}
        assert decision.matched_by == "strong_rule"

    @pytest.mark.asyncio
    async def test_low_confidence_llm_result_degrades_to_fallback(self) -> None:
        router = IntentRouter()
        provider = _ProviderJson('{"categories": ["memory_write"], "confidence": 0.45, "reason": "不确定"}')
        decision = await router.route_decision(
            "帮我处理一下这个问题",
            {"retrieval", "search", "memory_read", "memory_write", "meta"},
            provider=provider,
        )
        assert decision.matched_by == "fallback"
        assert "memory_write" not in decision.categories
