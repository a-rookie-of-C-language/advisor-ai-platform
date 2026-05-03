from __future__ import annotations

import logging
from typing import List

from .base_strategy import BaseSourcePriorityStrategy
from .source_candidate import SourceCandidate

logger = logging.getLogger(__name__)


class ConflictDetectStrategy(BaseSourcePriorityStrategy):
    """检测多源结果之间的矛盾，生成 LLM 提示。

    矛盾定义：RAG 说"支持 X"，Web 说"不支持 X"（或反之）。
    非矛盾：RAG 说"支持 X"，Web 没提 X（信息缺失不算矛盾）。
    """

    name = "conflict_detect_v1"
    order = 400

    def rank(
        self,
        candidates: List[SourceCandidate],
        query: str,
        scene_hint: str,
    ) -> List[SourceCandidate]:
        rag_items = [c for c in candidates if c.source == "rag"]
        web_items = [c for c in candidates if c.source == "web"]

        if rag_items and web_items:
            conflicts = self._detect_conflicts(rag_items, web_items)
            if conflicts:
                hint = self._build_conflict_hint(conflicts)
                for c in candidates:
                    c.metadata["_conflict_hint"] = hint
                logger.info("conflict_detect: 发现 %d 处矛盾", len(conflicts))

        return candidates

    def _detect_conflicts(
        self,
        rag_items: List[SourceCandidate],
        web_items: List[SourceCandidate],
    ) -> List[dict]:
        """简单的关键词矛盾检测。

        当 RAG 和 Web 内容包含对立关键词时标记为矛盾。
        """
        conflicts = []
        negation_pairs = [
            ("支持", "不支持"),
            ("允许", "不允许"),
            ("可以", "不可以"),
            ("是", "不是"),
            ("有", "没有"),
            ("需要", "不需要"),
            ("必须", "不必"),
        ]

        rag_text = " ".join(c.content for c in rag_items)
        web_text = " ".join(c.content for c in web_items)

        for pos, neg in negation_pairs:
            # 否定词包含肯定词时（如"不允许"包含"允许"）
            # 只检查否定词是否存在，避免子串误判
            neg_contains_pos = pos in neg

            if neg_contains_pos:
                rag_has_pos = pos in rag_text and neg not in rag_text
                web_has_neg = neg in web_text
                rag_has_neg = neg in rag_text
                web_has_pos = pos in web_text and neg not in web_text
            else:
                rag_has_pos = pos in rag_text and neg not in rag_text
                web_has_neg = neg in web_text and pos not in web_text
                rag_has_neg = neg in rag_text and pos not in rag_text
                web_has_pos = pos in web_text and neg not in web_text

            if (rag_has_pos and web_has_neg) or (rag_has_neg and web_has_pos):
                conflicts.append({
                    "keyword_positive": pos,
                    "keyword_negative": neg,
                    "rag_source": rag_items[0].metadata.get("source", "知识库"),
                    "web_source": web_items[0].metadata.get("source", "网络"),
                })

        return conflicts

    @staticmethod
    def _build_conflict_hint(conflicts: List[dict]) -> str:
        lines = ["⚠️ 检测到多源信息存在矛盾，请注意："]
        for i, c in enumerate(conflicts, 1):
            lines.append(
                f"{i}. 关于「{c['keyword_positive']}」："
                f"知识库（{c['rag_source']}）与网络信息（{c['web_source']}）存在分歧。"
            )
        lines.append("请综合判断，优先以权威来源为准，并在回答中说明信息差异。")
        return "\n".join(lines)
