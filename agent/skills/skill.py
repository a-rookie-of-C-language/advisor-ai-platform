from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Skill:
    """A composable capability unit that the LLM can autonomously select."""

    name: str
    description: str
    system_prompt: str
    required_tools: set[str] = field(default_factory=set)
    priority: int = 0
