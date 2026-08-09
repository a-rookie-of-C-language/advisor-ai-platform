from __future__ import annotations

from pydantic import BaseModel


class ExpandSkillInput(BaseModel):
    skill_name: str
