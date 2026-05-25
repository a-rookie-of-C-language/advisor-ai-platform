from __future__ import annotations

from pydantic import BaseModel, Field


class WorkspaceReadInput(BaseModel):
    """workspace_read 输入模型。"""

    path: str = Field(..., description="文件相对路径，相对于 workspace/{user_id}/{session_id}/")
    offset: int = Field(default=0, ge=0, description="读取起始位置，单位字节")
    limit: int = Field(default=8192, gt=0, le=1048576, description="最大读取字节数，最大 1MB")
