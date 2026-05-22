from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel

from tools.base_tool import BaseTool
from tools.tool_result import ToolResult

MAX_MCP_DESCRIPTION_LENGTH = 2048


def normalize_name(name: str) -> str:
    """Convert a tool/server name to a safe lowercase identifier."""
    normalized = re.sub(r"[^a-zA-Z0-9]", "_", name)
    normalized = re.sub(r"_+", "_", normalized)
    return normalized.strip("_").lower()


def build_mcp_tool_name(server_name: str, tool_name: str) -> str:
    return f"mcp__{normalize_name(server_name)}__{normalize_name(tool_name)}"


def truncate_description(description: str) -> str:
    if len(description) > MAX_MCP_DESCRIPTION_LENGTH:
        return description[:MAX_MCP_DESCRIPTION_LENGTH] + "... [truncated]"
    return description


class McpToolInputModel(BaseModel):
    class Config:
        extra = "allow"


class McpToolAdapter(BaseTool):
    """Adapter that exposes an MCP server tool as an internal BaseTool."""

    def __init__(
        self,
        server_name: str,
        mcp_tool_name: str,
        description: str,
        input_schema: dict[str, Any],
        client_pool: Any,
        server_config: Any,
        mcp_annotations: dict[str, Any] | None = None,
        category: str | None = None,
    ) -> None:
        annotations = mcp_annotations or {}
        read_only = annotations.get("readOnlyHint", False)
        destructive = annotations.get("destructiveHint", False)
        open_world = annotations.get("openWorldHint", False)
        search_hint = annotations.get("anthropic/searchHint", "")
        always_load = annotations.get("anthropic/alwaysLoad", False)

        super().__init__(
            name=build_mcp_tool_name(server_name, mcp_tool_name),
            description=truncate_description(description),
            input_model=McpToolInputModel,
            input_json_schema=input_schema,
            required_permissions=set(),
            category=category or normalize_name(server_name),
        )

        self._server_name = server_name
        self._mcp_tool_name = mcp_tool_name
        self._client_pool = client_pool
        self._server_config = server_config
        self._is_concurrency_safe = True
        self._is_destructive = destructive
        self._is_read_only = True
        self._is_open_world = open_world
        self._search_hint = search_hint or ""
        self._always_load = always_load
        self._max_result_size_chars = 20000
        self._declared_read_only = read_only

    async def execute(self, tool_input: Any, context: dict[str, Any]) -> ToolResult:
        _ = context
        try:
            if hasattr(tool_input, "model_dump"):
                args = tool_input.model_dump()
            elif hasattr(tool_input, "dict"):
                args = tool_input.dict()
            else:
                args = dict(tool_input) if tool_input else {}

            result = await self._client_pool.call_tool(
                self._server_config,
                self._mcp_tool_name,
                args,
            )

            if result.get("ok"):
                content = result.get("content", [])
                return ToolResult(
                    ok=True,
                    status="success",
                    message=self._format_content(content),
                    items=content,
                )

            error = result.get("error", "Unknown error")
            return ToolResult(
                ok=False,
                status="error",
                message=f"MCP tool execution failed: {error}",
                items=[],
            )
        except Exception as exc:  # noqa: BLE001
            return ToolResult(
                ok=False,
                status="error",
                message=f"MCP tool execution error: {exc}",
                items=[],
            )

    @staticmethod
    def _format_content(content: list[dict[str, Any]]) -> str:
        if not content:
            return ""

        parts = []
        for item in content:
            if item.get("type") == "text":
                parts.append(item.get("text", ""))
            elif item.get("type") == "image":
                parts.append("[Image data]")
            elif item.get("type") == "resource":
                parts.append(str(item.get("text", "")))
            else:
                parts.append(str(item))

        return "\n".join(parts)

    def get_is_concurrency_safe(self, tool_input: Any) -> bool:
        _ = tool_input
        return self._is_concurrency_safe

    def get_is_destructive(self, tool_input: Any) -> bool:
        _ = tool_input
        return self._is_destructive

    def get_is_read_only(self) -> bool:
        return self._is_read_only

    def get_search_hint(self) -> str:
        return self._search_hint

    def get_always_load(self) -> bool:
        return self._always_load

    def get_should_defer(self) -> bool:
        return not self._always_load

    def get_query_patterns(self) -> list[str]:
        patterns_map = {
            "list_students": [
                r"学生(?:列表|名单|有哪些|信息)",
                r"(?:查询|查看|获取|列出).*(?:学生|学生列表|学生名单)",
                r"(?:所有|全部|当前|现在).*(?:学生|学生列表|学生名单)",
                r"(?:多少|几个|几名|总共|共有|数量).*(?:学生|学生数量)",
                r"(?:学生|学生数量).*(?:多少|几个|几名|总共|共有|数量)",
            ],
            "get_student": [
                r"(?:查询|获取|查看).*(?:学生|学号|姓名).*(?:详情|信息|资料)",
                r"学生.*(?:学号|姓名).*(?:是什么|查询|获取|查看)",
                r"(?:学号|姓名).*学生",
                r"学生详情",
            ],
            "get_student_checkin_summary": [
                r"学生签到.*(?:汇总|统计|概况|总览)",
                r"签到.*(?:情况|状态|汇总|统计)",
                r"学生.*(?:考勤|签到).*(?:汇总|统计)",
            ],
            "get_student_checkin_detail": [
                r"学生签到.*(?:明细|详情|记录)",
                r"签到.*(?:明细|详情|记录|历史)",
                r"学生.*(?:考勤|签到).*(?:明细|详情|记录)",
            ],
        }
        return patterns_map.get(self._mcp_tool_name, [])

    def get_semantic_keywords(self) -> list[str]:
        keywords_map = {
            "list_students": [
                "学生",
                "学生列表",
                "学生名单",
                "有哪些学生",
                "全部学生",
                "当前学生",
                "学生数量",
                "多少学生",
                "有多少个学生",
            ],
            "get_student": [
                "学生详情",
                "学生信息",
                "学号",
                "姓名",
                "查询学生",
            ],
            "get_student_checkin_summary": [
                "签到汇总",
                "考勤汇总",
                "签到统计",
                "学生考勤",
            ],
            "get_student_checkin_detail": [
                "签到明细",
                "考勤明细",
                "签到记录",
                "考勤记录",
            ],
        }
        return keywords_map.get(self._mcp_tool_name, [])

    def __repr__(self) -> str:
        return f"McpToolAdapter(name={self.name}, server={self._server_name})"
