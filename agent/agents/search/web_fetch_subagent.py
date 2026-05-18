from __future__ import annotations

from typing import Any

from agents.search.base_subagent import WebToolSubAgent
from agents.search.schema import WebFetchResult

_JUDGE_SYSTEM_PROMPT = (
    "你是一个网页内容审核助手。请分析网页内容并完成两个任务：\n"
    "1. 总结：提取与用户需求相关的关键信息\n"
    "2. 合规判定：判断内容是否包含违规内容（暴力、色情、违法犯罪指导、钓鱼诈骗等）\n\n"
    "输出 JSON 格式：\n"
    '{"summary": "内容的精炼总结", "safe": true/false, '
    '"filtered_reason": "如果不合规说明原因否则为null"}'
)


class WebFetchSubAgent(WebToolSubAgent):
    def __init__(self, llm_provider: Any, web_fetch_tool: Any) -> None:
        super().__init__(
            name="web_fetch_subagent",
            llm_provider=llm_provider,
            tool=web_fetch_tool,
            judge_system_prompt=_JUDGE_SYSTEM_PROMPT,
        )

    async def fetch(self, url: str, max_content_length: int = 2000) -> WebFetchResult:
        from tools.web_fetch.web_fetch_input import WebFetchInput

        tool_input = WebFetchInput(url=url, max_content_length=max_content_length)
        raw_result = await self._execute_tool(tool_input)

        if not raw_result.ok:
            return WebFetchResult(
                content="",
                url=url,
                source="web",
                safe=True,
                filtered_reason=f"fetch failed: {raw_result.message}",
            )

        if not raw_result.items:
            return WebFetchResult(
                content="",
                url=url,
                source="web",
                safe=True,
                filtered_reason="no content extracted",
            )

        content = raw_result.items[0].get("content", "")
        judgment = await self._judge(content)

        return WebFetchResult(
            content=content,
            url=url,
            source="web",
            safe=judgment.get("safe", True),
            filtered_reason=judgment.get("filtered_reason"),
        )