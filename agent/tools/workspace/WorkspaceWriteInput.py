from __future__ import annotations

from pydantic import BaseModel, Field


class WorkspaceWriteInput(BaseModel):
    """workspace_write 输入模型。"""

    path: str = Field(..., description="文件相对路径")
    content: str = Field(..., description="文件内容")
    is_final: bool = Field(default=False, description="是否写入 final 目录，表示最终文件")
