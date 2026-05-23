from __future__ import annotations

from pydantic import BaseModel, Field


class WorkspaceReadInput(BaseModel):
    """workspace_read 输入模型"""

    path: str = Field(..., description="文件相对路径（相对于 workspace/{user_id}/{session_id}/）")
    offset: int = Field(default=0, ge=0, description="读取起始位置（字节）")
    limit: int = Field(default=8192, gt=0, le=1048576, description="最大读取字节数，最大 1MB")


class WorkspaceWriteInput(BaseModel):
    """workspace_write 输入模型"""

    path: str = Field(..., description="文件相对路径")
    content: str = Field(..., description="文件内容")
    is_final: bool = Field(default=False, description="是否写入 final 目录（最终文件）")


class WorkspaceEditInput(BaseModel):
    """workspace_edit 输入模型"""

    path: str = Field(..., description="文件相对路径")
    old_string: str = Field(..., description="需要替换的原字符串")
    new_string: str = Field(..., description="替换后的新字符串")
    is_final: bool = Field(default=False, description="是否写入 final 目录")


class WorkspaceListInput(BaseModel):
    """workspace_list 输入模型"""

    path: str = Field(default=".", description="目录相对路径")
    recursive: bool = Field(default=False, description="是否递归列出子目录")


class WorkspaceCreateDirInput(BaseModel):
    """workspace_create_dir 输入模型"""

    path: str = Field(..., description="目录相对路径")
    is_final: bool = Field(default=False, description="是否在 final 目录下创建")