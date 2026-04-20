from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from agents.base.agent import Agent, AgentContext

logger = logging.getLogger(__name__)


class ToolPermission(Enum):
    LLM = "llm"
    MEMORY_READ = "memory_read"
    MEMORY_WRITE = "memory_write"
    TASK_SUBMIT = "task_submit"
    SEARCH = "search"
    RAG_READ = "rag_read"
    SUMMARIZE = "summarize"
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"


@dataclass
class PermissionConfig:
    allowed_tools: set[ToolPermission] = field(default_factory=set)
    read_resources: set[str] = field(default_factory=lambda: {"context", "memory"})
    write_resources: set[str] = field(default_factory=set)

    def allows_tool(self, tool: ToolPermission) -> bool:
        return tool in self.allowed_tools

    def allows_read(self, resource: str) -> bool:
        return resource in self.read_resources

    def allows_write(self, resource: str) -> bool:
        return resource in self.write_resources

    @classmethod
    def memory_worker(cls) -> "PermissionConfig":
        return cls(
            allowed_tools={ToolPermission.LLM, ToolPermission.MEMORY_READ, ToolPermission.MEMORY_WRITE},
            read_resources={"context", "memory"},
            write_resources={"memory"},
        )


class SubAgent(Agent):
    def __init__(
        self,
        name: str,
        parent: Agent | None = None,
        permission_config: PermissionConfig | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(name=name, **kwargs)
        self._parent = parent
        self._permission = permission_config or PermissionConfig()

    @property
    def parent(self) -> Agent | None:
        return self._parent

    @property
    def permission(self) -> PermissionConfig:
        return self._permission

    def get_parent_context(self) -> AgentContext | None:
        if self._parent is None:
            return None
        ctx = self._parent.context
        return AgentContext(
            user_id=ctx.user_id,
            session_id=ctx.session_id,
            kb_id=ctx.kb_id,
            metadata=ctx.metadata.copy(),
        )

    def check_tool(self, tool: ToolPermission) -> bool:
        return self._permission.allows_tool(tool)

    def check_read(self, resource: str) -> bool:
        return self._permission.allows_read(resource)

    def check_write(self, resource: str) -> bool:
        return self._permission.allows_write(resource)

    def ensure_can_write(self, resource: str) -> None:
        if not self.check_write(resource):
            raise PermissionError(f"SubAgent '{self._name}' has no write permission for '{resource}'")

    async def run_once(self) -> dict[str, Any]:
        raise NotImplementedError

    async def run(self) -> None:
        raise NotImplementedError
