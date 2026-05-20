from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel

from tools.base_tool import BaseTool
from tools.tool_result import ToolResult

# MCP 工具描述最大长度
MAX_MCP_DESCRIPTION_LENGTH = 2048


def normalize_name(name: str) -> str:
    """将工具名转换为适合作为标识符的格式（小写 + 下划线）"""
    # 替换非字母数字字符为下划线
    normalized = re.sub(r"[^a-zA-Z0-9]", "_", name)
    # 多个连续下划线合并为一个
    normalized = re.sub(r"_+", "_", normalized)
    # 去除首尾的下划线
    normalized = normalized.strip("_")
    return normalized.lower()


def build_mcp_tool_name(server_name: str, tool_name: str) -> str:
    """构建 MCP 工具的标准化名称

    格式：mcp__{server}__{tool}
    示例：mcp__filesystem__read_file
    """
    return f"mcp__{normalize_name(server_name)}__{normalize_name(tool_name)}"


def truncate_description(description: str) -> str:
    """截断过长的工具描述，防止上下文窗口被淹没"""
    if len(description) > MAX_MCP_DESCRIPTION_LENGTH:
        return description[:MAX_MCP_DESCRIPTION_LENGTH] + "... [truncated]"
    return description


class McpToolInputModel(BaseModel):
    """MCP 工具输入参数模型（动态生成）"""

    class Config:
        extra = "allow"


class McpToolAdapter(BaseTool):
    """MCP 工具适配器：将 MCP 服务器的工具适配为内部 BaseTool 格式

    特性：
    - 添加 mcp__server__tool 前缀，避免与内置工具冲突
    - 描述截断（超过 2048 字符）
    - 属性映射（readOnlyHint -> isReadOnly, destructiveHint -> isDestructive）
    - 支持 MCP annotations（searchHint, alwaysLoad）
    """

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
        normalized_name = build_mcp_tool_name(server_name, mcp_tool_name)
        truncated_desc = truncate_description(description)

        # 解析 MCP annotations
        annotations = mcp_annotations or {}
        read_only = annotations.get("readOnlyHint", False)
        destructive = annotations.get("destructiveHint", False)
        open_world = annotations.get("openWorldHint", False)
        search_hint = annotations.get("anthropic/searchHint", "")
        always_load = annotations.get("anthropic/alwaysLoad", False)

        # 根据服务器名设置类别，默认使用服务器名作为类别
        tool_category = category or normalize_name(server_name)

        super().__init__(
            name=normalized_name,
            description=truncated_desc,
            input_model=McpToolInputModel,
            input_json_schema=input_schema,
            required_permissions=set(),
            category=tool_category,
        )

        self._server_name = server_name
        self._mcp_tool_name = mcp_tool_name
        self._client_pool = client_pool
        self._server_config = server_config
        self._is_concurrency_safe = read_only
        self._is_destructive = destructive
        self._is_read_only = read_only
        self._is_open_world = open_world
        self._search_hint = search_hint or ""
        self._always_load = always_load
        self._max_result_size_chars = 20000
        # MCP 工具默认只读，可并发执行
        self._is_concurrency_safe = True
        self._is_read_only = True

    async def execute(self, tool_input: Any, context: dict[str, Any]) -> ToolResult:
        """执行 MCP 工具调用"""
        try:
            # 将输入转为字典
            if hasattr(tool_input, "model_dump"):
                args = tool_input.model_dump()
            elif hasattr(tool_input, "dict"):
                args = tool_input.dict()
            else:
                args = dict(tool_input) if tool_input else {}

            # 调用 MCP 工具
            result = await self._client_pool.call_tool(
                self._server_config,
                self._mcp_tool_name,
                args,
            )

            if result.get("ok"):
                content = result.get("content", [])
                message = self._format_content(content)
                return ToolResult(
                    ok=True,
                    status="success",
                    message=message,
                    items=content,
                )
            else:
                error = result.get("error", "Unknown error")
                return ToolResult(
                    ok=False,
                    status="error",
                    message=f"MCP tool execution failed: {error}",
                    items=[],
                )

        except Exception as e:
            return ToolResult(
                ok=False,
                status="error",
                message=f"MCP tool execution error: {str(e)}",
                items=[],
            )

    @staticmethod
    def _format_content(content: list[dict[str, Any]]) -> str:
        """格式化工具返回的内容"""
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
        return self._is_concurrency_safe

    def get_is_destructive(self, tool_input: Any) -> bool:
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
        """根据 MCP 工具名称返回对应的查询模式，用于意图路由自动选择工具"""
        patterns_map = {
            "list_students": [
                r"学生(列表|名单|有哪些)",
                r"查询.*学生",
                r"查看.*学生",
                r"获取.*学生.*列表",
                r"所有学生",
                r"学生信息列表",
            ],
            "get_student": [
                r"(?:查询|获取|查看).*(?:学生|学号|姓名).*(?:详情|信息|资料)",
                r"学生.*(?:学号|姓名).*(?:多少|是什么|查询)",
                r"(?:学号|姓名).*学生",
                r"学生详情",
            ],
            "get_student_checkin_summary": [
                r"学生签到.*(?:汇总|统计|概况|总)",
                r"签到.*(?:情况|状态|汇总)",
                r"学生.*(?:考勤|签到).*(?:汇总|统计)",
            ],
            "get_student_checkin_detail": [
                r"学生签到.*(?:明细|详情|记录)",
                r"签到.*(?:明细|详情|记录|历史)",
                r"学生.*(?:考勤|签到).*(?:明细|详情|记录)",
            ],
        }

        return patterns_map.get(self._mcp_tool_name, [])

    def __repr__(self) -> str:
        return f"McpToolAdapter(name={self.name}, server={self._server_name})"