from __future__ import annotations

from pydantic import BaseModel


class WorkspaceCreateDirOutput(BaseModel):
    """workspace_create_dir 输出模型。"""

    path: str
    created: bool
