from __future__ import annotations

import logging
from typing import Any

from agents.base.subagent import SubAgent
from agents.search.schema import WebSearchResult
from tools.tool_permission import PermissionConfig, ToolPermission
from tools.tool_result import ToolResult

logger = logging.getLogger(__name__)

_JUDGE_SYSTEM_PROMPT = (
    "你是一个搜索结果分析助手。请根据搜索结果完成两个任务：\n"
    "1. 总结：提取与用户查询相关的关键信息，生成简洁摘要\n"
    "2. 合规判定：判断搜索结果中是否包含违规内容（暴力、色情、违法犯罪指导等）\n\n"
    "输出 JSON 格式：\n"
    '{"summary": "搜索结果的精炼总结", "safe": true/false, '
    '"filtered_reason": "如果不合规说明原因否则为null", '
    '"key_facts": ["关键事实1", "关键事实2"]}'
)


class WebSearchSubAgent(SubAgent):
    def __init__(self, llm_provider: Any, web_search_tool: Any) -> None:
        super().__init__(
            name="web_search_subagent",
            llm_provider=llm_provider,
            permission_config=PermissionConfig.from_allowed_tools(
                {ToolPermission.LLM, ToolPermission.SEARCH},
                read_resources={"context"},
                write_resources=set(),
            ),
        )
        self._web_search_tool = web_search_tool

    async def search(self, query: str, max_results: int = 5) -> WebSearchResult:
        raw_result = await self._execute_search(query, max_results)

        if not raw_result.ok or not raw_result.items:
            return WebSearchResult(
                summary="未找到相关搜索结果",
                sources=[],
                safe=True,
                key_facts=[],
            )

        sources = raw_result.items
        judgment = await self._judge(query, sources)

        return WebSearchResult(
            summary=judgment.get("summary", ""),
            sources=sources,
            safe=judgment.get("safe", True),
            filtered_reason=judgment.get("filtered_reason"),
            key_facts=judgment.get("key_facts", []),
        )

    async def _execute_search(self, query: str, max_results: int) -> ToolResult:
        try:
            from tools.tool_impl.web_search_tool import WebSearchTool

            if isinstance(self._web_search_tool, WebSearchTool):
                from tools.tool_impl.web_search_input import WebSearchInput

                tool_input = WebSearchInput(query=query, max_results=max_results)
                return await self._web_search_tool.execute(tool_input, context={})
            result = await self._web_search_tool(query=query, max_results=max_results)
            if isinstance(result, ToolResult):
                return result
            return ToolResult(ok=True, status="hit", message="hit", items=result if isinstance(result, list) else [])
        except Exception as e:
            logger.error("web_search_subagent search failed: %s", e)
            return ToolResult(ok=False, status="error", message=str(e), items=[])

    async def _judge(self, query: str, sources: list[dict[str, Any]]) -> dict[str, Any]:
        sources_text = "\n".join(
            f"- [{item.get('title', '')}]({item.get('url', '')}): {item.get('snippet', '')}"
            for item in sources
        )
        user_content = f"用户查询：{query}\n\n搜索结果：\n{sources_text}"

        try:
            result = await self.call_llm_json(
                [
                    {"role": "system", "content": _JUDGE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ]
            )
            return result
        except Exception as e:
            logger.error("web_search_subagent judge failed: %s", e)
            return {"summary": sources_text, "safe": True, "key_facts": []}

    async def run_once(self) -> dict[str, Any]:
        return {}

    async def run(self) -> None:
        return None
