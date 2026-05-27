from __future__ import annotations

import logging
import re

from json_types import JsonObject, JsonValue
from llm.base_provider import BaseLLMProvider
from tools.base_tool import BaseTool
from tools.intent_router_fallback import build_fallback_decision
from tools.intent_router_llm_flow import route_by_llm
from tools.intent_router_registry import build_tool_route_metadata, compile_category_rules
from tools.intent_router_rule_flow import (
    route_by_rules_and_scores,
)
from tools.intent_router_rules import CATEGORY_RULES
from tools.intent_router_support import (
    normalize_categories,
)
from tools.intent_router_tool_matching import (
    match_tools_by_patterns,
)
from tools.RouteDecision import INTENT_ROUTE_EVENT, RouteDecision

logger = logging.getLogger(__name__)


async def emit_route_observation(
    decision: "RouteDecision",
    *,
    logger: logging.Logger,
    scope: str,
    session_id: JsonValue,
    emit=None,
) -> JsonObject:
    payload = decision.to_event_payload()
    logger.info(
        "intent_route %s: session_id=%s, matched_by=%s, confidence=%.2f, categories=%s, fallback_reason=%s, source=%s",
        scope,
        session_id,
        decision.matched_by,
        decision.confidence,
        payload["categories"],
        decision.fallback_reason,
        payload["source"],
    )
    if emit is not None:
        result = emit(INTENT_ROUTE_EVENT, payload)
        if hasattr(result, "__await__"):
            await result
    return payload


class IntentRouter:
    """Layered intent router: strong rules -> score -> lightweight LLM -> conservative fallback."""

    def __init__(
        self,
        category_rules: dict[str, dict[str, list[str]]] | None = None,
        *,
        llm_classifier: BaseLLMProvider | None = None,
        llm_confidence_threshold: float = 0.8,
        score_threshold: int = 3,
        allow_destructive_fallback: bool = False,
    ) -> None:
        self._rules = category_rules or CATEGORY_RULES
        self._compiled = compile_category_rules(self._rules)
        self._llm_classifier = llm_classifier
        self._llm_confidence_threshold = llm_confidence_threshold
        self._score_threshold = score_threshold
        self._allow_destructive_fallback = allow_destructive_fallback
        self._last_decision = RouteDecision(categories=set(), matched_by="none", confidence=0.0)
        self._tools: list[BaseTool] = []
        self._tool_patterns: list[tuple[str, re.Pattern[str]]] = []
        self._tool_semantic_keywords: dict[str, set[str]] = {}
        self._tool_categories: dict[str, str] = {}

    def register_tools(self, tools: list[BaseTool]) -> None:
        """Register tools and cache query patterns for routing."""
        self._tools = tools
        (
            self._tool_patterns,
            self._tool_semantic_keywords,
            self._tool_categories,
        ) = build_tool_route_metadata(tools)

    def _match_tools_by_patterns(self, query: str) -> list[str]:
        """Return tool names whose query patterns match the query."""
        return match_tools_by_patterns(query, self._tool_patterns)

    @property
    def last_decision(self) -> RouteDecision:
        return self._last_decision

    def route(self, query: str) -> set[str]:
        decision = self.route_decision_sync(query)
        return decision.categories

    def route_decision_sync(self, query: str, all_categories: set[str] | None = None) -> RouteDecision:
        normalized_categories = normalize_categories(all_categories or set(self._compiled.keys()), set(self._compiled))
        decision = self._route_by_rules_and_scores(query, normalized_categories)
        if decision.categories:
            self._last_decision = decision
            return decision
        fallback = self._build_fallback(normalized_categories, reason="rule_score_miss")
        self._last_decision = fallback
        return fallback

    async def route_decision(
        self,
        query: str,
        all_categories: set[str],
        provider: BaseLLMProvider | None = None,
    ) -> RouteDecision:
        normalized_categories = normalize_categories(all_categories, set(self._compiled))
        if not query.strip():
            decision = self._build_fallback(normalized_categories, reason="empty_query")
            self._last_decision = decision
            return decision

        rule_decision = self._route_by_rules_and_scores(query, normalized_categories)
        if self._should_accept_without_llm(rule_decision):
            self._last_decision = rule_decision
            return rule_decision

        llm_decision = await self._route_by_llm(query, normalized_categories, provider, rule_decision)
        if llm_decision is not None:
            self._last_decision = llm_decision
            return llm_decision

        fallback_reason = rule_decision.fallback_reason or "llm_unavailable"
        fallback = self._build_fallback(
            normalized_categories,
            reason=fallback_reason,
            scores=rule_decision.scores,
            matched_tools=rule_decision.matched_tools,
        )
        self._last_decision = fallback
        return fallback

    async def route_with_fallback(
        self,
        query: str,
        all_categories: set[str],
        provider: BaseLLMProvider | None = None,
    ) -> set[str]:
        decision = await self.route_decision(query, all_categories, provider)
        return decision.categories

    def _route_by_rules_and_scores(self, query: str, all_categories: set[str]) -> RouteDecision:
        return route_by_rules_and_scores(
            query=query,
            compiled_rules=self._compiled,
            all_categories=all_categories,
            tools=self._tools,
            tool_patterns=self._tool_patterns,
            tool_semantic_keywords=self._tool_semantic_keywords,
            tool_categories=self._tool_categories,
            score_threshold=self._score_threshold,
        )

    def _should_accept_without_llm(self, decision: RouteDecision) -> bool:
        return (
            bool(decision.categories)
            and decision.confidence >= 0.85
            and decision.matched_by in {"strong_rule", "score"}
        )

    async def _route_by_llm(
        self,
        query: str,
        all_categories: set[str],
        provider: BaseLLMProvider | None,
        rule_decision: RouteDecision | None = None,
    ) -> RouteDecision | None:
        classifier = self._llm_classifier or provider
        if classifier is None:
            return None
        if rule_decision is None:
            return None
        return await route_by_llm(
            query=query,
            all_categories=all_categories,
            known_categories=set(self._compiled),
            classifier=classifier,
            llm_confidence_threshold=self._llm_confidence_threshold,
            rule_decision=rule_decision,
        )

    def _build_fallback(
        self,
        all_categories: set[str],
        *,
        reason: str,
        scores: dict[str, int] | None = None,
        matched_tools: list[str] | None = None,
    ) -> RouteDecision:
        return build_fallback_decision(
            all_categories,
            reason=reason,
            allow_destructive_fallback=self._allow_destructive_fallback,
            scores=scores,
            matched_tools=matched_tools,
        )
