from __future__ import annotations

import inspect
import json
import logging
import re
from typing import Awaitable, Callable

from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryDecision import DecisionType, MemoryDecision
from context.memory.core.MemoryItem import MemoryItem

logger = logging.getLogger(__name__)

# LLM caller type: takes a prompt string, returns response string
LLMCaller = Callable[[str], str | Awaitable[str]]

# Patterns for casual chat / temporary info with no long-term value
_CASUAL_CHAT = re.compile(
    r"^(好的?|嗯|哦|知道了|谢谢|不客气|没问题|可以|行|好吧|哈哈|呵呵|嗯嗯|"
    r"hi|hello|ok|yes|no|thanks|sure|got it|understood|bye|再见|拜拜)$",
    re.IGNORECASE,
)

# Temporary info patterns (weather, hunger, tiredness, etc.)
_TEMPORAL_NO_VALUE = re.compile(
    r"(今天天气|好冷|好热|下雨|肚子饿|困了|累了|无聊|在吗|你好|早上好|晚安|"
    r"weather|hungry|tired|bored|good morning|good night)",
    re.IGNORECASE,
)

# Ambiguous reference patterns (pronouns without context)
_AMBIGUOUS_REFERENCES = ["这个", "那个", "它", "他", "她", "他们", "这个东西", "那个东西", "this", "that", "it", "they"]

# Decision prompt for LLM
_DECISION_PROMPT = """你是一个记忆管理专家。根据候选记忆和已有相似记忆，决定如何处理这条候选记忆。

决策类型：
- add: 全新信息，值得长期记录（用户偏好、身份、目标、约束等）
- update: 和已有记忆相关，但内容更新（如偏好变化、事实修正）
- merge: 候选记忆和已有记忆表达同一含义，需要合并
- invalidate: 新信息和旧记忆矛盾，旧记忆应该失效
- ignore: 无长期价值的信息（闲聊、临时信息、问候、已过时）

规则：
1. 如果候选记忆和已有记忆完全相同或高度相似 → update（更新置信度）
2. 如果候选记忆是已有记忆的补充或细化 → merge（合并内容）
3. 如果候选记忆和已有记忆矛盾 → invalidate（使旧记忆失效）+ add（添加新记忆）
4. 如果候选记忆是全新的、有长期价值的 → add
5. 如果候选记忆没有长期价值（闲聊、临时信息、问候）→ ignore

输入：
候选记忆: {candidate_content}
候选置信度: {candidate_confidence}
候选类型: {candidate_type}
已有相似记忆:
{similar_memories_text}

返回严格 JSON，不要有其他文字:
{{"decision": "add|update|merge|invalidate|ignore", "reason": "决策原因", "target_memory_id": null或数字ID, "merged_content": null或"合并后的文本"}}
"""


class DecisionEngine:
    """Hybrid memory write decision engine: rule-based fast path + LLM fine-grained decisions."""

    def __init__(
        self,
        llm_caller: LLMCaller | None = None,
        near_duplicate_threshold: float = 0.95,
        low_confidence_threshold: float = 0.4,
    ) -> None:
        self._llm_caller = llm_caller
        self._near_duplicate_threshold = near_duplicate_threshold
        self._low_confidence_threshold = low_confidence_threshold

    async def decide(
        self,
        candidate: MemoryCandidate,
        similar_memories: list[MemoryItem],
    ) -> MemoryDecision:
        """Decide how to handle a memory candidate.

        First applies rule-based fast checks, then falls back to LLM for complex cases.
        """
        # Layer 1: Rule-based fast path
        rule_result = self._rule_decide(candidate, similar_memories)
        if rule_result is not None:
            logger.debug(
                "Rule decision: %s for '%s' reason=%s",
                rule_result.decision.value,
                candidate.content[:50],
                rule_result.reason,
            )
            return rule_result

        # Layer 2: LLM fine-grained decision
        if self._llm_caller is not None:
            llm_result = await self._llm_decide(candidate, similar_memories)
            if llm_result is not None:
                logger.debug(
                    "LLM decision: %s for '%s' reason=%s",
                    llm_result.decision.value,
                    candidate.content[:50],
                    llm_result.reason,
                )
                return llm_result

        # Fallback: if no LLM or LLM failed, default to ADD
        logger.debug("Fallback decision: ADD for '%s'", candidate.content[:50])
        return MemoryDecision(decision=DecisionType.ADD, reason="fallback: no LLM available")

    def _rule_decide(
        self,
        candidate: MemoryCandidate,
        similar_memories: list[MemoryItem],
    ) -> MemoryDecision | None:
        """Rule-based fast decision. Returns None if uncertain (needs LLM)."""
        content = candidate.content.strip()
        normalized = content.lower()

        # 1. Low confidence → ignore
        if candidate.confidence < self._low_confidence_threshold:
            return MemoryDecision(DecisionType.IGNORE, reason="confidence too low")

        # 2. Casual chat / greetings → ignore
        if self._is_casual_chat(normalized):
            return MemoryDecision(DecisionType.IGNORE, reason="casual chat or greeting")

        # 3. Temporary info with no long-term value → ignore
        if self._is_temporary_info(normalized):
            return MemoryDecision(DecisionType.IGNORE, reason="temporary info, no long-term value")

        # 4. Incomplete / ambiguous reference → ignore
        if self._is_incomplete(content, normalized):
            return MemoryDecision(DecisionType.IGNORE, reason="incomplete or ambiguous reference")

        # 5. Near-duplicate with high similarity → update
        if similar_memories:
            most_similar = similar_memories[0]
            if most_similar.score and most_similar.score > self._near_duplicate_threshold:
                return MemoryDecision(
                    DecisionType.UPDATE,
                    reason="near-duplicate, update confidence",
                    target_memory_id=most_similar.id,
                )

        # 6. No similar memories → add
        if not similar_memories:
            return MemoryDecision(DecisionType.ADD, reason="new information, no similar memory")

        # 7. Has similar memories but uncertain → needs LLM
        return None

    async def _llm_decide(
        self,
        candidate: MemoryCandidate,
        similar_memories: list[MemoryItem],
    ) -> MemoryDecision | None:
        """LLM-based fine-grained decision."""
        try:
            similar_text = self._format_similar_memories(similar_memories)
            prompt = _DECISION_PROMPT.format(
                candidate_content=candidate.content,
                candidate_confidence=f"{candidate.confidence:.2f}",
                candidate_type=candidate.memory_type,
                similar_memories_text=similar_text,
            )

            response = self._llm_caller(prompt)
            if inspect.isawaitable(response):
                response = await response

            return self._parse_decision(response, similar_memories)
        except Exception as e:
            logger.warning("LLM decision failed: %s", e)
            return None

    def _format_similar_memories(self, memories: list[MemoryItem]) -> str:
        if not memories:
            return "（无）"
        lines = []
        for i, m in enumerate(memories[:5], 1):
            lines.append(f"{i}. [id={m.id}] {m.content} (confidence={m.confidence:.2f}, type={m.memory_type})")
        return "\n".join(lines)

    def _parse_decision(self, response: str, similar_memories: list[MemoryItem]) -> MemoryDecision | None:
        """Parse LLM JSON response into MemoryDecision."""
        text = response.strip()

        # Strip markdown code blocks
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON object from text
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group())
                except json.JSONDecodeError:
                    return None
            else:
                return None

        decision_str = str(data.get("decision", "add")).strip().lower()
        reason = str(data.get("reason", "")).strip()

        # Map decision string to DecisionType
        decision_map = {
            "add": DecisionType.ADD,
            "update": DecisionType.UPDATE,
            "merge": DecisionType.MERGE,
            "invalidate": DecisionType.INVALIDATE,
            "ignore": DecisionType.IGNORE,
        }
        decision_type = decision_map.get(decision_str)
        if decision_type is None:
            return None

        target_id = data.get("target_memory_id")
        if target_id is not None:
            try:
                target_id = int(target_id)
            except (ValueError, TypeError):
                target_id = None

        merged_content = data.get("merged_content")
        if merged_content is not None:
            merged_content = str(merged_content).strip()
            if not merged_content:
                merged_content = None

        return MemoryDecision(
            decision=decision_type,
            reason=reason,
            target_memory_id=target_id,
            merged_content=merged_content,
        )

    @staticmethod
    def _is_casual_chat(normalized: str) -> bool:
        if len(normalized) <= 3:
            return True
        return bool(_CASUAL_CHAT.match(normalized))

    @staticmethod
    def _is_temporary_info(normalized: str) -> bool:
        if _TEMPORAL_NO_VALUE.search(normalized) and len(normalized) < 20:
            return True
        return False

    @staticmethod
    def _is_incomplete(content: str, normalized: str) -> bool:
        for pattern in _AMBIGUOUS_REFERENCES:
            if pattern in normalized and len(content) < 15:
                return True
        return False
