from __future__ import annotations

from agent.json_types import JsonObject, JsonValue
import json
import logging
import re
from dataclasses import dataclass

from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage
from prompt.PromptBuilder import PromptBuilder
from tools.base_tool import BaseTool

logger = logging.getLogger(__name__)
_URL_PATTERN = re.compile(r"https?://[^\s)>\"]+")

_CATEGORY_RULES: dict[str, dict[str, list[str]]] = {
    "retrieval": {
        "strong": [
            r"(?:根据|按照|依据|参考).*(?:知识库|文档|资料)",
            r"(?:知识库|文档|资料).*(?:回答|说明|解释|总结)",
            r"(?:之前|以前).*(?:说过|提到|记录)",
        ],
        "weak": [
            r"知识库|文档|资料|检索|查找|有没有关于",
            r"参考.*(?:文档|资料|知识)",
        ],
    },
    "search": {
        "strong": [
            r"(?:网上|互联网|线上).*(?:搜索|查询|查)",
            r"(?:最新|新闻|今日|今天|最近).*(?:消息|动态|信息|政策|规定)?",
            r"(?:天气|股价|汇率|比赛|赛事)",
        ],
        "weak": [
            r"搜索|搜一下|查一下|搜一搜",
            r"(?:什么是|是谁|在哪|怎么样).*(?:最新|现在|目前)",
        ],
    },
    "memory_read": {
        "strong": [
            r"(?:回忆|查阅|查看|读取).*(?:记忆|备忘|笔记)",
            r"(?:我|我们).*(?:之前|以前).*(?:记住|记录).*(?:什么|内容)",
        ],
        "weak": [
            r"记忆|备忘|笔记",
            r"之前记过|以前记过",
        ],
    },
    "memory_write": {
        "strong": [
            r"(?:帮我|请|麻烦).*(?:记住|记下|保存)",
            r"(?:以后|下次).*(?:记住|记得|提醒我)",
            r"(?:写入|保存|记录|存储).*(?:记忆|备忘|笔记)",
        ],
        "weak": [
            r"记住|记下|保存|记录",
            r"记忆|备忘|笔记",
        ],
    },
    "skill": {
        "strong": [
            r"(?:调用|使用|展开).*(?:技能|skill)",
            r"(?:按照|根据).*(?:技能|skill).*(?:执行|处理)",
        ],
        "weak": [
            r"技能|skill",
            r"执行指南|完整指令",
        ],
    },
    "student": {
        "strong": [
            r"(?:查询|获取|查看).*(?:学生|学号|姓名).*(?:详情|信息|资料|列表)",
            r"(?:学生|学号|姓名).*(?:是什么|多少|查询|获取|查看)",
            r"学生详情|学生列表|学生信息",
            r"签到.*(?:汇总|统计|明细|详情)",
            r"(?:考勤|签到).*(?:情况|状态|记录)",
        ],
        "weak": [
            r"学生|学号|姓名|签到|考勤",
            r"有哪些学生",
            r"查一下.*学生",
        ],
    },
}

_CATEGORY_DESCRIPTIONS: dict[str, str] = {
    "retrieval": "基于知识库、文档、资料做检索与问答。",
    "search": "查询互联网最新时效信息。",
    "memory_read": "读取长期记忆、历史备忘或已保存用户信息。",
    "memory_write": "将用户偏好、约定或备忘写入长期记忆。",
    "skill": "展开技能说明或执行指南。",
    "meta": "元能力工具，通常仅在明确要求展开技能时使用。",
    "student": "查询学生信息、学号、姓名、签到记录等学生相关数据。",
}

_DEFAULT_READ_ONLY_CATEGORIES = {"retrieval", "search", "memory_read"}
_CATEGORY_ALIASES = {
    "writing": "memory_write",
    "memory": "memory_read",
    "read_memory": "memory_read",
    "write_memory": "memory_write",
    "expand_skill": "skill",
}


INTENT_ROUTE_EVENT = "intent_route"


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


@dataclass(frozen=True)
class RouteDecision:
    categories: set[str]
    matched_by: str
    confidence: float
    fallback_reason: str = ""
    scores: dict[str, int] | None = None
    reason: str = ""
    matched_tools: list[str] | None = None

    @property
    def event_name(self) -> str:
        return INTENT_ROUTE_EVENT

    def to_event_payload(self) -> JsonObject:
        categories = sorted(self.categories)
        return {
            "matched_by": self.matched_by,
            "confidence": self.confidence,
            "fallback_reason": self.fallback_reason,
            "categories": categories,
            "scores": self.scores or {},
            "reason": self.reason,
            "matched_tools": self.matched_tools or [],
            "source": {
                "decision": self.matched_by,
                "categories": categories,
                "matched_tools": self.matched_tools or [],
            },
        }


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
        self._rules = category_rules or _CATEGORY_RULES
        self._compiled: dict[str, dict[str, list[re.Pattern[str]]]] = {}
        for category, layers in self._rules.items():
            self._compiled[category] = {
                layer: [re.compile(pattern) for pattern in patterns]
                for layer, patterns in layers.items()
            }
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
        """注册工具，提取查询模式用于意图匹配"""
        self._tools = tools
        self._tool_patterns = []
        self._tool_semantic_keywords = {}
        self._tool_categories = {}
        for tool in tools:
            patterns = tool.get_query_patterns()
            for pattern in patterns:
                self._tool_patterns.append((tool.name, re.compile(pattern)))
            raw_keywords = getattr(tool, "get_semantic_keywords", lambda: [])()
            keywords = {str(item).strip().lower() for item in raw_keywords if str(item).strip()}
            if keywords:
                self._tool_semantic_keywords[tool.name] = keywords
            category = str(getattr(tool, "category", "") or "").strip()
            if category:
                self._tool_categories[tool.name] = category

    def _match_tools_by_patterns(self, query: str) -> list[str]:
        """根据工具查询模式匹配工具，返回匹配的工具名列表"""
        matched = set()
        for tool_name, pattern in self._tool_patterns:
            if pattern.search(query):
                matched.add(tool_name)
        return list(matched)

    @property
    def last_decision(self) -> RouteDecision:
        return self._last_decision

    def route(self, query: str) -> set[str]:
        decision = self.route_decision_sync(query)
        return decision.categories

    def route_decision_sync(self, query: str, all_categories: set[str] | None = None) -> RouteDecision:
        normalized_categories = self._normalize_categories(all_categories or set(self._compiled.keys()))
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
        normalized_categories = self._normalize_categories(all_categories)
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
        if not query.strip():
            return RouteDecision(categories=set(), matched_by="none", confidence=0.0, fallback_reason="empty_query")

        # 先匹配工具查询模式
        matched_tools = self._match_tools_by_patterns(query)
        normalized_query = query.strip().lower()

        student_list_tools = self._find_tools_by_base_names({"list_students"})
        if (
            "student" in all_categories
            and student_list_tools
            and self._looks_like_student_list_or_count_query(normalized_query)
        ):
            return RouteDecision(
                categories={"student"},
                matched_by="strong_rule",
                confidence=0.99,
                reason="student_list_or_count_query",
                scores={"student": 6},
                matched_tools=student_list_tools,
            )

        url = self._extract_first_url(query)
        if url:
            fetch_tools = self._find_tools_by_base_names({"web_fetch"})
            if fetch_tools:
                categories = {"search"} if "search" in all_categories else set(all_categories)
                return RouteDecision(
                    categories=categories,
                    matched_by="strong_rule",
                    confidence=0.99,
                    reason="url_detected_fetch",
                    scores={"search": 6} if "search" in categories else {},
                    matched_tools=fetch_tools,
                )

        strong_hits: set[str] = set()
        scores: dict[str, int] = {}
        for category, layers in self._compiled.items():
            if category not in all_categories:
                continue
            score = 0
            if self._match_any(layers.get("strong", []), query):
                strong_hits.add(category)
                score += 5
            weak_hit_count = self._match_count(layers.get("weak", []), query)
            if weak_hit_count:
                score += weak_hit_count * 2
            if score > 0:
                scores[category] = score

        semantic_matched_tools = self._match_tools_by_semantics(normalized_query)
        matched_tools = sorted(set(matched_tools) | set(semantic_matched_tools))
        self._apply_tool_semantic_boost(scores, semantic_matched_tools, all_categories)
        self._apply_structured_student_query_boost(scores, normalized_query, all_categories)

        if len(strong_hits) == 1:
            category = next(iter(strong_hits))
            return RouteDecision(
                categories={category},
                matched_by="strong_rule",
                confidence=0.98,
                scores=scores,
                matched_tools=matched_tools,
            )

        if len(strong_hits) > 1:
            top = self._pick_top_categories(scores, minimum_score=5)
            return RouteDecision(
                categories=top,
                matched_by="strong_conflict",
                confidence=0.55,
                fallback_reason="strong_conflict",
                scores=scores,
                matched_tools=matched_tools,
            )

        scored = self._pick_top_categories(scores, minimum_score=self._score_threshold)
        if len(scored) == 1:
            return RouteDecision(
                categories=scored,
                matched_by="score",
                confidence=0.88,
                scores=scores,
                matched_tools=matched_tools,
            )
        if len(scored) > 1:
            return RouteDecision(
                categories=scored,
                matched_by="score_conflict",
                confidence=0.6,
                fallback_reason="score_conflict",
                scores=scores,
                matched_tools=matched_tools,
            )

        # 没有匹配到任何类别，但有工具模式匹配
        if matched_tools:
            return RouteDecision(
                categories={"general"},
                matched_by="tool_pattern",
                confidence=0.85,
                fallback_reason="no_category_match_but_tool_matched",
                scores=scores,
                matched_tools=matched_tools,
            )

        return RouteDecision(
            categories=set(),
            matched_by="none",
            confidence=0.0,
            fallback_reason="score_below_threshold",
            scores=scores,
            matched_tools=matched_tools,
        )

    def _match_tools_by_semantics(self, normalized_query: str) -> list[str]:
        if not normalized_query:
            return []
        matched: list[str] = []
        for tool_name, keywords in self._tool_semantic_keywords.items():
            if any(keyword in normalized_query for keyword in keywords):
                matched.append(tool_name)
        return matched

    @staticmethod
    def _extract_first_url(query: str) -> str | None:
        found = _URL_PATTERN.search(query or "")
        if not found:
            return None
        return found.group(0)

    def _find_tools_by_base_names(self, base_names: set[str]) -> list[str]:
        matched: list[str] = []
        for tool in self._tools:
            name = str(getattr(tool, "name", "") or "").strip()
            if not name:
                continue
            if name in base_names:
                matched.append(name)
                continue
            if "__" in name:
                tail = name.split("__")[-1]
                if tail in base_names:
                    matched.append(name)
        return sorted(set(matched))

    @staticmethod
    def _looks_like_student_list_or_count_query(normalized_query: str) -> bool:
        has_student = "学生" in normalized_query
        has_list_or_count = any(
            token in normalized_query
            for token in (
                "列表",
                "名单",
                "有哪些",
                "所有",
                "全部",
                "多少",
                "几个",
                "几名",
                "数量",
                "总数",
                "共有",
                "当前",
                "现在",
            )
        )
        return has_student and has_list_or_count

    def _apply_tool_semantic_boost(
        self,
        scores: dict[str, int],
        matched_tools: list[str],
        all_categories: set[str],
    ) -> None:
        for tool_name in matched_tools:
            category = self._tool_categories.get(tool_name, "")
            if not category or category not in all_categories:
                continue
            scores[category] = scores.get(category, 0) + 3

    @staticmethod
    def _apply_structured_student_query_boost(
        scores: dict[str, int],
        normalized_query: str,
        all_categories: set[str],
    ) -> None:
        if "student" not in all_categories:
            return
        has_student = any(token in normalized_query for token in ("学生", "学号", "姓名"))
        has_structured_db_intent = any(token in normalized_query for token in ("数据库", "表", "记录", "查询", "查找"))
        if has_student and has_structured_db_intent:
            scores["student"] = scores.get("student", 0) + 4

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

        category_descriptions = [
            f"{category}: {self._describe_category(category)}"
            for category in sorted(all_categories)
        ]
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
        categories = self._normalize_categories(set(self._coerce_categories(raw_categories))) & all_categories
        confidence = self._coerce_confidence(payload.get("confidence") if isinstance(payload, dict) else None)
        reason = str(payload.get("reason", "")).strip() if isinstance(payload, dict) else ""
        if not categories:
            return None
        if confidence < self._llm_confidence_threshold:
            return None
        return RouteDecision(
            categories=categories,
            matched_by="llm",
            confidence=confidence,
            reason=reason,
            matched_tools=rule_decision.matched_tools,
        )

    def _build_fallback(
        self,
        all_categories: set[str],
        *,
        reason: str,
        scores: dict[str, int] | None = None,
        matched_tools: list[str] | None = None,
    ) -> RouteDecision:
        fallback_categories = set(all_categories & _DEFAULT_READ_ONLY_CATEGORIES)
        if self._allow_destructive_fallback:
            fallback_categories = set(all_categories)
        if not fallback_categories:
            fallback_categories = set(all_categories)
        return RouteDecision(
            categories=fallback_categories,
            matched_by="fallback",
            confidence=0.2,
            fallback_reason=reason,
            scores=scores,
            matched_tools=matched_tools,
        )

    @staticmethod
    def _match_any(patterns: list[re.Pattern[str]], query: str) -> bool:
        return any(pattern.search(query) for pattern in patterns)

    @staticmethod
    def _match_count(patterns: list[re.Pattern[str]], query: str) -> int:
        return sum(1 for pattern in patterns if pattern.search(query))

    @staticmethod
    def _pick_top_categories(scores: dict[str, int], *, minimum_score: int) -> set[str]:
        eligible = {category: score for category, score in scores.items() if score >= minimum_score}
        if not eligible:
            return set()
        top_score = max(eligible.values())
        if top_score <= 0:
            return set()
        return {category for category, score in eligible.items() if score == top_score}

    @staticmethod
    def _coerce_categories(raw_categories: JsonValue) -> list[str]:
        if isinstance(raw_categories, list):
            return [str(item).strip() for item in raw_categories if str(item).strip()]
        if isinstance(raw_categories, str) and raw_categories.strip():
            return [raw_categories.strip()]
        return []

    @staticmethod
    def _coerce_confidence(raw_confidence: JsonValue) -> float:
        try:
            confidence = float(raw_confidence)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(confidence, 1.0))

    def _normalize_categories(self, categories: set[str]) -> set[str]:
        normalized: set[str] = set()
        for category in categories:
            mapped = _CATEGORY_ALIASES.get(category, category)
            if mapped == "meta" and "skill" in self._compiled:
                normalized.add("skill")
                normalized.add("meta")
                continue
            normalized.add(mapped)
            if mapped == "skill":
                normalized.add("meta")
        return normalized

    def _describe_category(self, category: str) -> str:
        return _CATEGORY_DESCRIPTIONS.get(category, "宸ュ叿绫诲埆")
