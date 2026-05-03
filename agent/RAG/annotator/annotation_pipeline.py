from __future__ import annotations

import logging
from typing import List

from .base_annotator import BaseChunkAnnotator, ChunkAnnotation

logger = logging.getLogger(__name__)

_RULE_THRESHOLD = 0.8
_HANLP_THRESHOLD = 0.6


class AnnotationPipeline:
    """三层标注 Pipeline：规则 → HanLP → LLM，逐层提升置信度。"""

    def __init__(
        self,
        annotators: List[BaseChunkAnnotator] | None = None,
        rule_threshold: float = _RULE_THRESHOLD,
        hanlp_threshold: float = _HANLP_THRESHOLD,
    ) -> None:
        self._annotators = annotators or []
        self._rule_threshold = rule_threshold
        self._hanlp_threshold = hanlp_threshold

    def annotate_chunk(self, text: str) -> ChunkAnnotation:
        """对单个切片执行三层标注，命中阈值后提前返回。"""
        if not text.strip():
            return ChunkAnnotation(confidence=0.0, source="empty")

        ann: ChunkAnnotation | None = None

        for annotator in self._annotators:
            try:
                ann = annotator.annotate(text, existing=ann)
                logger.debug(
                    "annotation: source=%s, type=%s, authority=%s, date=%s, confidence=%.2f",
                    ann.source,
                    ann.type,
                    ann.authority,
                    ann.effective_date,
                    ann.confidence,
                )
            except Exception:
                logger.warning("annotator %s failed, skip", annotator.name, exc_info=True)
                continue

            # 规则层高置信度，跳过后续层
            if ann.source == "rule" and ann.confidence >= self._rule_threshold:
                logger.debug("annotation: rule 高置信度 (%.2f), 跳过后续层", ann.confidence)
                break

            # HanLP 层中置信度，跳过 LLM 层
            if ann.source == "hanlp" and ann.confidence >= self._hanlp_threshold:
                logger.debug("annotation: hanlp 中置信度 (%.2f), 跳过 LLM 层", ann.confidence)
                break

        if ann is None:
            return ChunkAnnotation(confidence=0.0, source="none")

        return ann
