from __future__ import annotations

import logging
from typing import Any

from agents.base.subagent import SubAgent
from agents.search.schema import WebFetchResult
from tools.tool_permission import PermissionConfig, ToolPermission
from tools.tool_result import ToolResult

logger = logging.getLogger(__name__)

_JUDGE_SYSTEM_PROMPT = (
    "你是一个网页内容审核助手。请分析网页内容并完成两个任务：\n"
    "1. 总结：提取与用户需求相关的关键信息\n"
    "2. 合规判定：判断内容是否包含违规内容（暴力、色情、违法犯罪指导、钓鱼诈骗等）\n\n"
    "输出 JSON 格式：\n"
    '{"summary": "内容的精炼总结", "safe": true/false, '
    '"filtered_reason": "如果不合规说明原因否则为null"}'
)


class WebFetchSubAgent(SubAgent):
    def __init__(self, llm_provider: Any, web_fetch_tool: Any) -> None:
        super().__init__(
            name="web_fetch_subagent",
            llm_provider=llm_provider,
            permission_config=PermissionConfig.from_allowed_tools(
                {ToolPermission.LLM, ToolPermission.SEARCH},
                read_resources={"context"},
                write_resources=set(),
            ),
        )
        self._web_fetch_tool = web_fetch_tool

    async def fetch(self, url: str, max_content_length: int = 2000) -> WebFetchResult:
        raw_result = await self._execute_fetch(url, max_content_length)

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

    async def _execute_fetch(self, url: str, max_content_length: int) -> ToolResult:
        try:
            from tools.web_fetch import WebFetchInput

            if isinstance(self._web_fetch_tool, self._web_fetch_tool.__class__):
                tool_input = WebFetchInput(url=url, max_content_length=max_content_length)
                return await self._web_fetch_tool.execute(tool_input, context={})
            result = await self._web_fetch_tool(url=url, max_content_length=max_content_length)
            if isinstance(result, ToolResult):
                return result
            return ToolResult(ok=True, status="hit", message="hit", items=[{"content": result}])
        except Exception as e:
            logger.error("web_fetch_subagent fetch failed: %s", e)
            return ToolResult(ok=False, status="error", message=str(e), items=[])

    async def _judge(self, content: str) -> dict[str, Any]:
        try:
            result = await self.call_llm_json(
                [
                    {"role": "system", "content": _JUDGE_SYSTEM_PROMPT},
                    {"role": "user", "content": f"网页内容：\n{content[:2000]}"},
                ]
            )
            return result
        except Exception as e:
            logger.error("web_fetch_subagent judge failed: %s", e)
            return {"summary": content[:500], "safe": True, "filtered_reason": None}

    async def run_once(self) -> dict[str, Any]:
        return {}

    async def run(self) -> None:
        return None