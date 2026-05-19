from __future__ import annotations

from typing import Any

from agents.search.schema import WebSearchResult
from agents.search.WebToolSubAgent import WebToolSubAgent

_JUDGE_SYSTEM_PROMPT = (
    "你是一个搜索结果分析助手。请根据搜索结果完成两个任务：\n"
    "1. 总结：提取与用户查询相关的关键信息，生成简洁摘要\n"
    "2. 合规判定：判断搜索结果中是否包含违规内容（暴力、色情、违法犯罪指导等）\n\n"
    "输出 JSON 格式：\n"
    '{"summary": "搜索结果的精炼总结", "safe": true/false, '
    '"filtered_reason": "如果不合规说明原因否则为null", '
    '"key_facts": ["关键事实1", "关键事实2"]}'
)


class WebSearchSubAgent(WebToolSubAgent):
    def __init__(self, llm_provider: Any, web_search_tool: Any) -> None:
        super().__init__(
            name="web_search_subagent",
            llm_provider=llm_provider,
            tool=web_search_tool,
            judge_system_prompt=_JUDGE_SYSTEM_PROMPT,
        )

    async def search(self, query: str, max_results: int = 5) -> WebSearchResult:
        from tools.web_search import WebSearchInput

        tool_input = WebSearchInput(query=query, max_results=max_results)
        raw_result = await self._execute_tool(tool_input)

        if not raw_result.ok or not raw_result.items:
            return WebSearchResult(
                summary="未找到相关搜索结果",
                sources=[],
                safe=True,
                key_facts=[],
            )

        sources = raw_result.items
        judgment = await self._judge_search(query, sources)

        return WebSearchResult(
            summary=judgment.get("summary", ""),
            sources=sources,
            safe=judgment.get("safe", True),
            filtered_reason=judgment.get("filtered_reason"),
            key_facts=judgment.get("key_facts", []),
        )

    async def _judge_search(self, query: str, sources: list[dict[str, Any]]) -> dict[str, Any]:
        sources_text = "\n".join(
            f"- [{item.get('title', '')}]({item.get('url', '')}): {item.get('snippet', '')}"
            for item in sources
        )
        user_content = f"用户查询：{query}\n\n搜索结果：\n{sources_text}"
        return await self._judge(user_content)