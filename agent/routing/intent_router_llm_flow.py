from __future__ import annotations

import json
import logging

from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from prompt.PromptBuilder import PromptBuilder
from routing.intent_router_support import (
    coerce_categories,
    coerce_confidence,
    describe_category,
    normalize_categories,
)
from routing.RouteDecision import RouteDecision

logger = logging.getLogger(__name__)


async def route_by_llm(
    *,
    query: str,
    all_categories: set[str],
    known_categories: set[str],
    classifier: BaseLLMProvider,
    llm_confidence_threshold: float,
    rule_decision: RouteDecision,
) -> RouteDecision | None:
    category_descriptions = [f"{category}: {describe_category(category)}" for category in sorted(all_categories)]
    prompt = PromptBuilder.build_intent_routing_prompt(category_descriptions, query)
    messages = [ChatMessage(role="user", content=prompt)]
    response_text = ""
    try:
        async for chunk in classifier.stream_chat(messages, response_format={"type": "json_object"}):
            response_text += chunk
        payload = json.loads(response_text)
    except Exception as exc:  # noqa: BLE001
        logger.warning("intent_router llm classify failed: %s", exc)
        return None

    raw_categories = payload.get("categories", []) if isinstance(payload, dict) else []
    categories = normalize_categories(set(coerce_categories(raw_categories)), known_categories) & all_categories
    confidence = coerce_confidence(payload.get("confidence") if isinstance(payload, dict) else None)
    reason = str(payload.get("reason", "")).strip() if isinstance(payload, dict) else ""
    if not categories:
        return None
    if confidence < llm_confidence_threshold:
        return None
    return RouteDecision(
        categories=categories,
        matched_by="llm",
        confidence=confidence,
        reason=reason,
        matched_tools=rule_decision.matched_tools,
    )
