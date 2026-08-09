from __future__ import annotations

from pydantic import BaseModel


class WorkspaceReadOutput(BaseModel):
    """workspace_read 输出模型。"""

    content: str
    path: str
