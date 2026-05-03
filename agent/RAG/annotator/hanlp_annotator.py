from __future__ import annotations

import logging
from typing import Optional

from .base_annotator import BaseChunkAnnotator, ChunkAnnotation

logger = logging.getLogger(__name__)

_hanlp_tok = None
_hanlp_ner = None
_hanlp_loaded = False


def _ensure_hanlp() -> None:
    global _hanlp_tok, _hanlp_ner, _hanlp_loaded
    if _hanlp_loaded:
        return
    try:
        import hanlp

        _hanlp_tok = hanlp.load(hanlp.pretrained.tok.COARSE_ELECTRA_SMALL_ZH)
        _hanlp_ner = hanlp.load(hanlp.pretrained.ner.MSRA_NER_ELECTRA_SMALL_ZH)
        logger.info("HanLP 模型加载成功")
    except Exception:
        logger.warning("HanLP 加载失败，降级为跳过", exc_info=True)
    _hanlp_loaded = True


class HanlpAnnotator(BaseChunkAnnotator):
    """第二层：HanLP 轻量模型标注，本地推理，NER 提取日期/机构 + 文本分类。"""

    name = "hanlp_v1"

    def annotate(self, text: str, existing: Optional[ChunkAnnotation] = None) -> ChunkAnnotation:
        ann = existing or ChunkAnnotation()
        _ensure_hanlp()

        if _hanlp_tok is None or _hanlp_ner is None:
            ann.source = "hanlp_skip"
            return ann

        try:
            tokens = _hanlp_tok(text)
            ner_results = _hanlp_ner(tokens)

            org_names = []
            date_entities = []
            for token, label in zip(tokens, ner_results, strict=False):
                if label == "ORG":
                    org_names.append(token)
                elif label == "DATE":
                    date_entities.append(token)

            # 从 NER 日期实体中提取
            if date_entities and not ann.effective_date:
                date_str = self._parse_date_entities(date_entities)
                if date_str:
                    ann.effective_date = date_str

            # 从机构名判断权威性
            if ann.authority == "secondary" and org_names:
                official_orgs = ["教育部", "国务院", "财政部", "人社部", "委员会", "办公厅"]
                for org in org_names:
                    if any(kw in org for kw in official_orgs):
                        ann.authority = "official"
                        break

            confidence_boost = 0.0
            if date_entities:
                confidence_boost += 0.2
            if org_names:
                confidence_boost += 0.1
            ann.confidence = min(1.0, ann.confidence + confidence_boost)

        except Exception:
            logger.warning("HanLP 标注失败，跳过", exc_info=True)

        ann.source = "hanlp"
        return ann

    @staticmethod
    def _parse_date_entities(entities: list[str]) -> str:
        """尝试从 HanLP NER 日期实体中解析出 ISO 日期。"""
        import re

        for entity in entities:
            match = re.search(r"(\d{4})\D+(\d{1,2})\D+(\d{1,2})", entity)
            if match:
                y, m, d = match.group(1), match.group(2), match.group(3)
                return f"{y}-{int(m):02d}-{int(d):02d}"
            match = re.search(r"(\d{4})\D+(\d{1,2})", entity)
            if match:
                y, m = match.group(1), match.group(2)
                return f"{y}-{int(m):02d}-01"
        return ""
