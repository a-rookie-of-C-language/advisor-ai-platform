from __future__ import annotations

import logging
import re
from typing import Optional

from .base_annotator import BaseChunkAnnotator, ChunkAnnotation

logger = logging.getLogger(__name__)

# 文号正则：教XX〔2024〕15号、国发〔2023〕1号 等
_DOC_NUMBER_PATTERN = re.compile(
    r"([一-鿿]{1,6})[发办函字]?[〔（\(\[](\d{4})[〕）\)\]]\s*(\d+)\s*号"
)

# 日期正则：2024年6月1日、2024-06-01、2024/06/01
_DATE_PATTERNS = [
    re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日"),
    re.compile(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})"),
]

# 类型关键词
_TYPE_KEYWORDS = {
    "policy": [
        "通知", "意见", "办法", "规定", "条例", "细则", "方案", "决定",
        "公告", "通告", "通报", "批复", "函", "会议纪要",
    ],
    "product": [
        "产品", "功能", "系统", "平台", "服务", "操作指南", "使用说明",
        "用户手册", "技术规范", "接口文档",
    ],
}

# 权威性关键词
_AUTHORITY_KEYWORDS = {
    "official": [
        "教育部", "国务院", "中共中央", "财政部", "人力资源和社会保障部",
        "省", "市", "自治区", "直辖市", "委员会", "办公厅",
    ],
}


class RuleAnnotator(BaseChunkAnnotator):
    """第一层：规则引擎标注，零成本，快速提取结构化信息。"""

    name = "rule_v1"

    def annotate(self, text: str, existing: Optional[ChunkAnnotation] = None) -> ChunkAnnotation:
        ann = existing or ChunkAnnotation()
        confidence_boost = 0.0

        # 提取文号
        doc_match = _DOC_NUMBER_PATTERN.search(text)
        if doc_match:
            org = doc_match.group(1)
            year = doc_match.group(2)
            num = doc_match.group(3)
            ann.extra["doc_number"] = f"{org}〔{year}〕{num}号"
            ann.extra["doc_org"] = org
            if not ann.effective_date:
                ann.effective_date = f"{year}-01-01"
            confidence_boost += 0.3

        # 提取日期
        for pattern in _DATE_PATTERNS:
            date_match = pattern.search(text)
            if date_match:
                year, month, day = date_match.group(1), date_match.group(2), date_match.group(3)
                extracted_date = f"{year}-{int(month):02d}-{int(day):02d}"
                if not ann.effective_date or extracted_date > ann.effective_date:
                    ann.effective_date = extracted_date
                confidence_boost += 0.2
                break

        # 判断类型
        if ann.type == "general":
            for doc_type, keywords in _TYPE_KEYWORDS.items():
                hits = sum(1 for kw in keywords if kw in text)
                if hits >= 2:
                    ann.type = doc_type
                    confidence_boost += 0.2
                    break
                elif hits == 1:
                    ann.type = doc_type
                    confidence_boost += 0.1
                    break

        # 判断权威性
        if ann.authority == "secondary":
            for auth_type, keywords in _AUTHORITY_KEYWORDS.items():
                if any(kw in text for kw in keywords):
                    ann.authority = auth_type
                    confidence_boost += 0.2
                    break

        ann.confidence = min(1.0, ann.confidence + confidence_boost)
        ann.source = "rule"
        return ann
