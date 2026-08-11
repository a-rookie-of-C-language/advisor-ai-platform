from __future__ import annotations

import logging

from json_types import JsonObject
from tools.core.base_tool import BaseTool
from tools.core.tool_result import ToolResult
from tools.permissions.tool_permission import ToolPermission
from tools.workspace.workspace_manager import (
    BinaryFileError,
    DepthLimitError,
    FileCountLimitError,
    FileSizeLimitError,
    PathTraversalError,
    WorkspaceManager,
)
from tools.workspace.WorkspaceWriteInput import WorkspaceWriteInput
from tools.workspace.WorkspaceWriteOutput import WorkspaceWriteOutput

logger = logging.getLogger(__name__)


class WorkspaceWriteTool(BaseTool[WorkspaceWriteInput, WorkspaceWriteOutput]):
    """写入 workspace 文件的工具"""

    def __init__(self, manager: WorkspaceManager) -> None:
        super().__init__(
            name="workspace_write",
            description=(
                "Write content to a file in workspace. "
                "Use is_final=True to mark as final output (preserved after cleanup)."
            ),
            input_model=WorkspaceWriteInput,
            required_permissions={ToolPermission.FILE_WRITE},
            category="workspace",
        )
        self._manager = manager
        self._is_destructive = False
        self._permission_matcher = "workspace.write"

    async def execute(self, tool_input: WorkspaceWriteInput, context: JsonObject) -> ToolResult:
        user_id = context.get("user_id")
        session_id = context.get("session_id")

        try:
            result = self._manager.write(
                user_id=user_id,
                session_id=session_id,
                relative_path=tool_input.path,
                content=tool_input.content,
                is_final=tool_input.is_final,
            )
            location = "final/" if tool_input.is_final else ""
            return ToolResult(
                ok=True,
                status="hit",
                message="file written successfully",
                items=[{"path": location + tool_input.path, "size": result["size"]}],
            )
        except PathTraversalError as e:
            logger.warning("workspace_write path traversal: %s", e)
            return ToolResult.denied(f"安全错误: {e}")
        except BinaryFileError:
            return ToolResult.error("不支持写入二进制文件")
        except FileSizeLimitError:
            return ToolResult.error("内容大小超限（最大 1MB）")
        except DepthLimitError:
            return ToolResult.error("目录深度超限（最大 5 层）")
        except FileCountLimitError as e:
            return ToolResult.error(f"{e}")
        except Exception as e:
            logger.exception("workspace_write error: %s", e)
            return ToolResult.error(f"写入文件失败: {e}")
