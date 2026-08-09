from __future__ import annotations

from tools.workspace.WorkspaceError import WorkspaceError


class FileCountLimitError(WorkspaceError):
    """文件数量超限"""
