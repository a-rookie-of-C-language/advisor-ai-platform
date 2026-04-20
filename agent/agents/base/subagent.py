from __future__ import annotations

import logging
from typing import Any

from agents.base.agent import Agent, AgentContext
from agents.base.tool_permission import PermissionConfig, ToolPermission

logger = logging.getLogger(__name__)


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
