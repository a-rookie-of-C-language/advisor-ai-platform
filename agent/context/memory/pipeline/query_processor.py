from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Dict, List, Set

DEFAULT_STOP_WORDS: Set[str] = {
    "的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一",
    "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有",
    "看", "好", "自己", "这", "他", "她", "它", "们", "那", "什么", "怎么",
    "为什么", "如何", "哪", "哪个", "哪些", "这个", "那个", "这些", "那些",
    "可以", "能", "可能", "应该", "需要", "想要", "希望", "觉得", "认为",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "of", "in", "to", "for", "with", "on", "at", "from", "by", "about",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "and", "but", "or", "nor", "so", "yet", "both", "either", "neither",
    "not", "only", "own", "same", "than", "too", "very", "just",
}

DEFAULT_SYNONYMS: Dict[str, List[str]] = {
    "辅导员": ["思政教师", "学工", "学生工作"],
    "学生": ["同学", "学员"],
    "问题": ["难题", "困难", "疑问"],
    "帮助": ["协助", "支持", "援助"],
}

# 预编译正则，避免每次调用都重新编译
_RE_TOKEN = re.compile(r"[a-z0-9_]+|[一-鿿]+")
_RE_WHITESPACE = re.compile(r"[　\s]+")


def _build_synonym_pattern(synonyms: Dict[str, List[str]]) -> re.Pattern | None:
    """把所有同义词关键词合并成一个正则，按长度降序避免短词优先匹配"""
    if not synonyms:
        return None
    all_keys = list(synonyms.keys())
    all_keys.sort(key=len, reverse=True)
    pattern = "|".join(re.escape(k) for k in all_keys)
    return re.compile(pattern)


@lru_cache(maxsize=2048)
def _tokenize_cached(text: str) -> tuple[str, ...]:
    """缓存分词结果，同一文本只计算一次"""
    return tuple(_RE_TOKEN.findall(text.lower()))


@dataclass(slots=True)
class ProcessedQuery:
    original: str
    normalized: str
    tokens: List[str] = field(default_factory=list)
    stop_word_mask: List[bool] = field(default_factory=list)
    expanded_tokens: Set[str] = field(default_factory=set)


class QueryProcessor:
    def __init__(
        self,
        stop_words: Set[str] | None = None,
        synonyms: Dict[str, List[str]] | None = None,
        enable_synonym_expansion: bool = True,
        enable_normalization: bool = True,
    ) -> None:
        self._stop_words = stop_words or DEFAULT_STOP_WORDS
        self._synonyms = synonyms or DEFAULT_SYNONYMS
        self._enable_synonyms = enable_synonym_expansion
        self._enable_norm = enable_normalization
        self._syn_pattern = _build_synonym_pattern(self._synonyms) if enable_synonym_expansion else None

    def process(self, query: str) -> ProcessedQuery:
        if not query or not query.strip():
            return ProcessedQuery(
                original=query or "",
                normalized="",
                tokens=[],
                stop_word_mask=[],
                expanded_tokens=set(),
            )

        normalized = self._normalize(query) if self._enable_norm else query.strip()
        tokens = self._tokenize(normalized)
        stop_mask = [token in self._stop_words for token in tokens]
        expanded = self._expand_synonyms(tokens) if self._enable_synonyms else set()

        return ProcessedQuery(
            original=query,
            normalized=normalized,
            tokens=tokens,
            stop_word_mask=stop_mask,
            expanded_tokens=expanded,
        )

    @staticmethod
    def _normalize(text: str) -> str:
        normalized = unicodedata.normalize("NFKC", text)
        normalized = _RE_WHITESPACE.sub(" ", normalized).strip()
        return normalized

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return list(_tokenize_cached(text.lower()))

    def _expand_synonyms(self, tokens: List[str]) -> Set[str]:
        if not self._synonyms or not self._enable_synonyms:
            return set()

        expanded: Set[str] = set()
        for token in tokens:
            if token in self._synonyms:
                for syn in self._synonyms[token]:
                    expanded.update(self._tokenize(syn))
        return expanded

    def build_search_query(self, processed: ProcessedQuery) -> str:
        all_tokens = set(processed.tokens)
        all_tokens.update(processed.expanded_tokens)
        return " ".join(sorted(all_tokens))