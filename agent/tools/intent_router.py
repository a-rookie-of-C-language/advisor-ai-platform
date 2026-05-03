from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# 意图类别 → 触发关键词/正则
_CATEGORY_RULES: dict[str, list[str]] = {
    "retrieval": [
        r"知识库|文档|资料|检索|查找|搜一下|有没有关于",
        r"根据|按照|依据|参考.*(?:文档|资料|知识)",
        r"(?:之前|以前).*(?:说过|提到|记录)",
    ],
    "search": [
        r"搜索|搜一下|查一下|最新|新闻|今日|今天|最近",
        r"(?:网上|互联网|线上).*(?:搜|查|找)",
        r"(?:天气|股价|汇率|比赛|赛事)",
        r"(?:什么是|是谁|在哪|怎么样).*(?:最新|现在|目前)",
    ],
    "writing": [
        r"(?:记住|保存|记录|写入|存储).*(?:记忆|备忘|笔记)",
        r"(?:帮我|请).*(?:记住|记下|保存)",
        r"(?:以后|下次).*(?:记住|记得|提醒我)",
    ],
}


class IntentRouter:
    """基于规则的意图路由器，将用户查询映射到 tool category 集合。"""

    def __init__(
        self,
        category_rules: dict[str, list[str]] | None = None,
    ) -> None:
        self._rules = category_rules or _CATEGORY_RULES
        self._compiled: dict[str, list[re.Pattern[str]]] = {}
        for category, patterns in self._rules.items():
            self._compiled[category] = [re.compile(p) for p in patterns]

    def route(self, query: str) -> set[str]:
        """分析用户查询，返回命中的 category 集合。为空时调用方应回退到全量注入。"""
        if not query:
            return set()

        matched: set[str] = set()
        for category, patterns in self._compiled.items():
            for pattern in patterns:
                if pattern.search(query):
                    matched.add(category)
                    break

        if not matched:
            logger.debug("intent_router: no category matched for query=%s", query[:50])
        else:
            logger.debug("intent_router: matched categories=%s for query=%s", matched, query[:50])
        return matched

    def route_with_fallback(self, query: str, all_categories: set[str]) -> set[str]:
        """路由查询，无匹配时回退到全量 category 集合。"""
        matched = self.route(query)
        return matched if matched else all_categories
