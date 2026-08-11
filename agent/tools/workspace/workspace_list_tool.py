from __future__ import annotations

import logging

from json_types import JsonObject
from tools.core.base_tool import BaseTool
from tools.core.tool_result import ToolResult
from tools.permissions.tool_permission import ToolPermission
from tools.workspace.workspace_manager import (
    BinaryFileError,
    PathTraversalError,
    WorkspaceManager,
)
from tools.workspace.WorkspaceListInput import WorkspaceListInput
from tools.workspace.WorkspaceListOutput import WorkspaceListOutput

logger = logging.getLogger(__name__)


class WorkspaceListTool(BaseTool[WorkspaceListInput, WorkspaceListOutput]):
    """列出 workspace 目录内容的工具"""

    def __init__(self, manager: WorkspaceManager) -> None:
        super().__init__(
            name="workspace_list",
            description="List files and directories in workspace. Use recursive=True to list subdirectories.",
            input_model=WorkspaceListInput,
            required_permissions={ToolPermission.FILE_READ},
            category="workspace",
        )
        self._manager = manager
        self._is_read_only = True
        self._permission_matcher = "workspace.read"

    async def execute(self, tool_input: WorkspaceListInput, context: JsonObject) -> ToolResult:
        user_id = context.get("user_id")
        session_id = context.get("session_id")

        try:
            items = self._manager.list(
                user_id=user_id,
                session_id=session_id,
                relative_path=tool_input.path,
                recursive=tool_input.recursive,
            )
            return ToolResult(
                ok=True,
                status="hit",
                message="list success",
                items=items,
            )
        except PathTraversalError as e:
            logger.warning("workspace_list path traversal: %s", e)
            return ToolResult.denied(f"安全错误: {e}")
        except BinaryFileError:
            return ToolResult.error("不支持操作二进制文件")
        except Exception as e:
            logger.exception("workspace_list error: %s", e)
            return ToolResult.error(f"列出目录失败: {e}")
