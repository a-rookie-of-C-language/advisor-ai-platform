from __future__ import annotations

import logging

from skills.skill import Skill

logger = logging.getLogger(__name__)


class SkillRegistry:
    """Registry that holds all available skills and supports dynamic registration."""

    def __init__(self) -> None:
        self._skills: dict[str, Skill] = {}

    def register(self, skill: Skill) -> None:
        if skill.name in self._skills:
            logger.warning("Overwriting existing skill: %s", skill.name)
        self._skills[skill.name] = skill

    def get(self, name: str) -> Skill | None:
        return self._skills.get(name)

    def list_all(self) -> list[Skill]:
        return sorted(self._skills.values(), key=lambda s: s.priority, reverse=True)

    def catalog_prompt(self) -> str:
        """Build a prompt snippet listing all available skills for LLM selection."""
        lines = ["Available skills:"]
        for skill in self.list_all():
            lines.append(f"- {skill.name}: {skill.description}")
        return "\n".join(lines)

    def brief_prompt(self, names: list[str]) -> str:
        """Build a prompt from the brief of selected skills (progressive disclosure)."""
        parts = []
        for name in names:
            skill = self.get(name)
            if skill is not None:
                parts.append(f"[{skill.name}] {skill.brief}")
        return "\n".join(parts)

    def expand_skill(self, name: str) -> str:
        """Return the full system_prompt for a single skill (on-demand expansion)."""
        skill = self.get(name)
        if skill is None:
            return ""
        return skill.system_prompt
