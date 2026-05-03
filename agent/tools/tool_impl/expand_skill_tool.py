from __future__ import annotations

from typing import Any

from skills.skill_registry import SkillRegistry
from tools.base_tool import BaseTool
from tools.tool_impl.expand_skill_input import ExpandSkillInput
from tools.tool_permission import ToolPermission
from tools.tool_result import ToolResult


class ExpandSkillTool(BaseTool[ExpandSkillInput, None]):
    """虚拟工具：LLM 按需展开指定 skill 的完整指令。"""

    def __init__(self, skill_registry: SkillRegistry) -> None:
        super().__init__(
            name="expand_skill",
            description="展开指定技能的完整指令，获取更详细的执行指南。当 brief 指令不足以完成任务时调用。",
            input_model=ExpandSkillInput,
            required_permissions={ToolPermission.LLM},
            category="meta",
        )
        self._skill_registry = skill_registry
        self._is_read_only = True
        self._is_concurrency_safe = True
        self._should_defer = False
        self._always_load = True

    async def execute(self, tool_input: ExpandSkillInput, context: dict[str, Any]) -> ToolResult:
        _ = context
        full_prompt = self._skill_registry.expand_skill(tool_input.skill_name)
        if not full_prompt:
            return ToolResult.error(f"skill not found: {tool_input.skill_name}")
        return ToolResult(
            ok=True,
            status="hit",
            message=f"expanded skill: {tool_input.skill_name}",
            items=[{"skill_name": tool_input.skill_name, "full_prompt": full_prompt}],
        )
