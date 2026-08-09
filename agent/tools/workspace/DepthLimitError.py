from __future__ import annotations

from tools.workspace.WorkspaceError import WorkspaceError


class DepthLimitError(WorkspaceError):
    """目录深度超限"""
