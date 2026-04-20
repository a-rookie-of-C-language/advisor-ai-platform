from __future__ import annotations

from typing import Any

from agents.base.subagent import SubAgent
from tools.tool_permission import PermissionConfig, ToolPermission


class ContextCompactionSubAgent(SubAgent):
    def __init__(self, llm_provider: Any) -> None:
        super().__init__(
            name="context_compaction_subagent",
            llm_provider=llm_provider,
            permission_config=PermissionConfig(
                allowed_tools={ToolPermission.LLM},
                read_resources={"context"},
                write_resources=set(),
            ),
        )

    async def summarize_transcript(self, transcript: str) -> str:
        prompt = (
            "请将以下完整对话压缩为可用于后续推理的摘要。"
            "保留用户偏好、约束、未完成任务、关键事实和工具结论。"
            "禁止编造信息，输出简洁要点。"
        )
        return await self.call_llm(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": transcript},
            ]
        )

    async def run_once(self) -> dict[str, Any]:
        return {}

    async def run(self) -> None:
        return None

