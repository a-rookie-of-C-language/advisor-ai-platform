from __future__ import annotations

from tools.workspace.WorkspaceError import WorkspaceError


class PathTraversalError(WorkspaceError):
    """路径穿越尝试"""
