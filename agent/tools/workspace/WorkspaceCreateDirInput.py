from __future__ import annotations

from pydantic import BaseModel, Field


class WorkspaceCreateDirInput(BaseModel):
    """workspace_create_dir 输入模型。"""

    path: str = Field(..., description="目录相对路径")
    is_final: bool = Field(default=False, description="是否在 final 目录下创建")
