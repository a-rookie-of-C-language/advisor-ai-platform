from __future__ import annotations

from pydantic import BaseModel


class WorkspaceListOutput(BaseModel):
    """workspace_list 输出模型。"""

    items: list[dict]
