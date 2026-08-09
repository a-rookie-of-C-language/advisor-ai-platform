from __future__ import annotations

from pydantic import BaseModel, Field


class WorkspaceEditInput(BaseModel):
    """workspace_edit 输入模型。"""

    path: str = Field(..., description="文件相对路径")
    old_string: str = Field(..., description="需要替换的原字符串")
    new_string: str = Field(..., description="替换后的新字符串")
    is_final: bool = Field(default=False, description="是否写入 final 目录")
