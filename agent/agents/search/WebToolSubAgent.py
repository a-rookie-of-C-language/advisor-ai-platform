from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from agents.base.subagent import SubAgent
from llm.base_provider import BaseLLMProvider
from tools.tool_permission import PermissionConfig, ToolPermission

if TYPE_CHECKING:
    from tools.base_tool import BaseTool
    from tools.tool_result import ToolResult

logger = logging.getLogger(__name__)

_JUDGE_CONTENT_MAX = 2000
_JUDGE_FALLBACK_MAX = 500


class WebToolSubAgent(SubAgent):
    """网页工具 SubAgent 基类，封装通用逻辑。"""

    def __init__(
        self,
        name: str,
        llm_provider: BaseLLMProvider,
        tool: "BaseTool",
        judge_system_prompt: str,
    ) -> None:
        super().__init__(
            name=name,
            llm_provider=llm_provider,
            permission_config=PermissionConfig.from_allowed_tools(
                {ToolPermission.LLM, ToolPermission.SEARCH},
                read_resources={"context"},
                write_resources=set(),
            ),
        )
        self._tool = tool
        self._judge_system_prompt = judge_system_prompt

    async def _execute_tool(self, tool_input: Any) -> "ToolResult":
        """统一工具执行逻辑，支持新旧两种调用方式。"""
        try:
            if hasattr(self._tool, "execute"):
                return await self._tool.execute(tool_input, context={})
            result = await self._tool(tool_input)
            if hasattr(result, "ok"):
                return result
            return result
        except Exception as e:
            logger.error("%s tool execution failed: %s", self._name, e)
            from tools.tool_result import ToolResult

            return ToolResult(ok=False, status="error", message=str(e), items=[])

    async def _judge(self, content: str) -> dict[str, Any]:
        """统一 LLM 审核逻辑。"""
        try:
            return await self.call_llm_json(
                [
                    {"role": "system", "content": self._judge_system_prompt},
                    {"role": "user", "content": f"内容：\n{content[:_JUDGE_CONTENT_MAX]}"},
                ]
            )
        except Exception as e:
            logger.error("%s judge failed: %s", self._name, e)
            return {"summary": content[:_JUDGE_FALLBACK_MAX], "safe": True, "filtered_reason": None}

    async def run_once(self) -> dict[str, Any]:
        return {}

    async def run(self) -> None:
        return None
