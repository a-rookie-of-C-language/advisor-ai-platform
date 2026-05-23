from __future__ import annotations

import logging

from pydantic import BaseModel

from json_types import JsonObject
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult
from tools.workspace.workspace_input import WorkspaceCreateDirInput
from tools.workspace.workspace_manager import (
    BinaryFileError,
    PathTraversalError,
    WorkspaceManager,
    DepthLimitError,
    FileCountLimitError,
)

logger = logging.getLogger(__name__)


class WorkspaceCreateDirOutput(BaseModel):
    """workspace_create_dir 输出模型"""
    path: str
    created: bool


class WorkspaceCreateDirTool(BaseTool[WorkspaceCreateDirInput, WorkspaceCreateDirOutput]):
    """创建 workspace 目录的工具"""

    def __init__(self, manager: WorkspaceManager) -> None:
        super().__init__(
            name="workspace_create_dir",
            description="Create a directory in workspace. Use is_final=True to create in final output directory.",
            input_model=WorkspaceCreateDirInput,
            required_permissions={ToolPermission.FILE_WRITE},
            category="workspace",
        )
        self._manager = manager
        self._is_destructive = False
        self._permission_matcher = "workspace.write"

    async def execute(self, tool_input: WorkspaceCreateDirInput, context: JsonObject) -> ToolResult:
        user_id = context.get("user_id")
        session_id = context.get("session_id")

        try:
            result = self._manager.create_dir(
                user_id=user_id,
                session_id=session_id,
                relative_path=tool_input.path,
                is_final=tool_input.is_final,
            )
            location = "final/" if tool_input.is_final else ""
            return ToolResult(
                ok=True,
                status="hit",
                message="directory created successfully",
                items=[{"path": location + tool_input.path, "created": True}],
            )
        except PathTraversalError as e:
            logger.warning("workspace_create_dir path traversal: %s", e)
            return ToolResult.denied(f"安全错误: {e}")
        except BinaryFileError:
            return ToolResult.error("不支持操作二进制文件")
        except DepthLimitError as e:
            return ToolResult.error(f"目录深度超限（最大 5 层）")
        except FileCountLimitError as e:
            return ToolResult.error(f"{e}")
        except Exception as e:
            logger.exception("workspace_create_dir error: %s", e)
            return ToolResult.error(f"创建目录失败: {e}")