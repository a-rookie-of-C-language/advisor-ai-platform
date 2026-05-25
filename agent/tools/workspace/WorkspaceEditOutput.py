from __future__ import annotations

from pydantic import BaseModel


class WorkspaceEditOutput(BaseModel):
    """workspace_edit 输出模型。"""

    path: str
    replaced: bool
