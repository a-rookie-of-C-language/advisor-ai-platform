from __future__ import annotations

from pydantic import BaseModel


class WorkspaceWriteOutput(BaseModel):
    """workspace_write 输出模型。"""

    path: str
    size: int
