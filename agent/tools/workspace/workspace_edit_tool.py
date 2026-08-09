from __future__ import annotations

import logging

from json_types import JsonObject
from tools.core.base_tool import BaseTool
from tools.permissions.tool_permission import ToolPermission
from tools.core.tool_result import ToolResult
from tools.workspace.workspace_manager import (
    BinaryFileError,
    DepthLimitError,
    FileCountLimitError,
    PathTraversalError,
    WorkspaceManager,
)
from tools.workspace.WorkspaceEditInput import WorkspaceEditInput
from tools.workspace.WorkspaceEditOutput import WorkspaceEditOutput

logger = logging.getLogger(__name__)


class WorkspaceEditTool(BaseTool[WorkspaceEditInput, WorkspaceEditOutput]):
    """编辑 workspace 文件的工具"""

    def __init__(self, manager: WorkspaceManager) -> None:
        super().__init__(
            name="workspace_edit",
            description=(
                "Edit a file in workspace by replacing old_string with new_string. "
                "Use is_final=True to save to final output."
            ),
            input_model=WorkspaceEditInput,
            required_permissions={ToolPermission.FILE_WRITE},
            category="workspace",
        )
        self._manager = manager
        self._is_destructive = False
        self._permission_matcher = "workspace.write"

    async def execute(self, tool_input: WorkspaceEditInput, context: JsonObject) -> ToolResult:
        user_id = context.get("user_id")
        session_id = context.get("session_id")

        try:
            self._manager.edit(
                user_id=user_id,
                session_id=session_id,
                relative_path=tool_input.path,
                old_string=tool_input.old_string,
                new_string=tool_input.new_string,
                is_final=tool_input.is_final,
            )
            location = "final/" if tool_input.is_final else ""
            return ToolResult(
                ok=True,
                status="hit",
                message="file edited successfully",
                items=[{"path": location + tool_input.path, "replaced": True}],
            )
        except PathTraversalError as e:
            logger.warning("workspace_edit path traversal: %s", e)
            return ToolResult.denied(f"安全错误: {e}")
        except BinaryFileError:
            return ToolResult.error("不支持编辑二进制文件")
        except FileNotFoundError:
            return ToolResult(
                ok=True,
                status="miss",
                message="file not found",
                items=[],
            )
        except ValueError as e:
            return ToolResult.error(f"编辑失败: {e}")
        except DepthLimitError:
            return ToolResult.error("目录深度超限（最大 5 层）")
        except FileCountLimitError as e:
            return ToolResult.error(f"{e}")
        except Exception as e:
            logger.exception("workspace_edit error: %s", e)
            return ToolResult.error(f"编辑文件失败: {e}")
