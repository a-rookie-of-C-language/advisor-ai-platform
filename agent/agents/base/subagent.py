from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from agents.base.agent import Agent, AgentContext, AgentState

logger = logging.getLogger(__name__)


@dataclass
class PermissionConfig:
    """SubAgent权限配置"""

    read_resources: set[str] = field(default_factory=lambda: {"context", "memory"})
    write_resources: set[str] = field(default_factory=set)
    can_call_tools: bool = False
    can_call_llm: bool = True

    def allows_read(self, resource: str) -> bool:
        return resource in self._read_resources

    def allows_write(self, resource: str) -> bool:
        return resource in self._write_resources

    @property
    def _read_resources(self) -> set[str]:
        return self.read_resources

    @property
    def _write_resources(self) -> set[str]:
        return self.write_resources

    @classmethod
    def memory_worker(cls) -> "PermissionConfig":
        """记忆Worker权限：只读context，只写memory"""
        return cls(
            read_resources={"context", "memory"},
            write_resources={"memory"},
            can_call_tools=False,
            can_call_llm=True,
        )


class SubAgent(Agent):
    """SubAgent基类

    继承Agent全部能力，增加约束：
    - 只读父Agent上下文（通过 parent_context 获取副本）
    - 受限写权限（通过 permission_config 配置）
    - 共享上下文缓存（与父Agent共享LLM上下文窗口）

    使用示例：
        parent = Agent(name="parent", llm_provider=..., memory_client=...)
        worker = SubAgent(
            name="memory_worker",
            parent=parent,
            permission_config=PermissionConfig.memory_worker(),
            memory_client=api_client,
        )
    """

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
        """只读访问父Agent上下文（返回副本，防止修改）"""
        if self._parent is None:
            return None
        ctx = self._parent.context
        return AgentContext(
            user_id=ctx.user_id,
            session_id=ctx.session_id,
            kb_id=ctx.kb_id,
            metadata=ctx.metadata.copy(),
        )

    def check_read(self, resource: str) -> bool:
        """检查读权限"""
        return self._permission.allows_read(resource)

    def check_write(self, resource: str) -> bool:
        """检查写权限"""
        return self._permission.allows_write(resource)

    def ensure_can_write(self, resource: str) -> None:
        """确保有写权限，否则抛异常"""
        if not self.check_write(resource):
            raise PermissionError(f"SubAgent '{self._name}' has no write permission for '{resource}'")

    async def run_once(self) -> dict[str, Any]:
        raise NotImplementedError

    async def run(self) -> None:
        raise NotImplementedError
