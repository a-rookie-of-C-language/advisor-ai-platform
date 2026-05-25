from __future__ import annotations

import logging

from json_types import JsonObject
from tools.base_tool import BaseTool
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult
from tools.workspace.WorkspaceReadInput import WorkspaceReadInput
from tools.workspace.WorkspaceReadOutput import WorkspaceReadOutput
from tools.workspace.workspace_manager import (
    BinaryFileError,
    FileSizeLimitError,
    PathTraversalError,
    WorkspaceManager,
    DepthLimitError,
    FileCountLimitError,
)

logger = logging.getLogger(__name__)


class WorkspaceReadTool(BaseTool[WorkspaceReadInput, WorkspaceReadOutput]):
    """读取 workspace 文件的工具"""

    def __init__(self, manager: WorkspaceManager) -> None:
        super().__init__(
            name="workspace_read",
            description="Read file content from workspace. User workspace is isolated by user_id and session_id.",
            input_model=WorkspaceReadInput,
            required_permissions={ToolPermission.FILE_READ},
            category="workspace",
        )
        self._manager = manager
        self._is_read_only = True
        self._permission_matcher = "workspace.read"

    async def execute(self, tool_input: WorkspaceReadInput, context: JsonObject) -> ToolResult:
        user_id = context.get("user_id")
        session_id = context.get("session_id")

        try:
            content = self._manager.read(
                user_id=user_id,
                session_id=session_id,
                relative_path=tool_input.path,
                offset=tool_input.offset,
                limit=tool_input.limit,
            )
            return ToolResult(
                ok=True,
                status="hit",
                message="file read success",
                items=[{"content": content, "path": tool_input.path}],
            )
        except PathTraversalError as e:
            logger.warning("workspace_read path traversal: %s", e)
            return ToolResult.denied(f"安全错误: {e}")
        except BinaryFileError as e:
            logger.warning("workspace_read binary file: %s", e)
            return ToolResult.error(f"不支持操作二进制文件")
        except FileSizeLimitError as e:
            logger.warning("workspace_read size limit: %s", e)
            return ToolResult.error(f"文件大小超限: {e}")
        except FileNotFoundError as e:
            return ToolResult(
                ok=True,
                status="miss",
                message="file not found",
                items=[],
            )
        except UnicodeDecodeError:
            return ToolResult.error("文件不是有效的文本文件")
        except Exception as e:
            logger.exception("workspace_read error: %s", e)
            return ToolResult.error(f"读取文件失败: {e}")
