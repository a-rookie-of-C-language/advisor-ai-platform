from __future__ import annotations

from pydantic import BaseModel, Field


class WorkspaceListInput(BaseModel):
    """workspace_list 输入模型。"""

    path: str = Field(default=".", description="目录相对路径")
    recursive: bool = Field(default=False, description="是否递归列出子目录")
