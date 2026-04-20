from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from memory.core.schema import MemoryCandidate, MemoryItem, WritebackResult
from tools.tool_permission import PermissionConfig, ToolPermission

logger = logging.getLogger(__name__)


class AgentState(Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"


@dataclass
class AgentContext:
    user_id: int | None = None
    session_id: int | None = None
    kb_id: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolCallResult:
    tool_name: str
    success: bool
    result: str
    error: str | None = None


class Agent(ABC):
    def __init__(
        self,
        name: str,
        llm_provider: Any = None,
        memory_client: Any = None,
        tools: dict[str, Any] | None = None,
        permission_config: PermissionConfig | None = None,
    ) -> None:
        self._name = name
        self._state = AgentState.CREATED
        self._llm_provider = llm_provider
        self._memory_client = memory_client
        self._tools = tools or {}
        self._context = AgentContext()
        self._permission = permission_config or PermissionConfig()
        logger.debug("agent_created name=%s", name)

    @property
    def name(self) -> str:
        return self._name

    @property
    def state(self) -> AgentState:
        return self._state

    @property
    def context(self) -> AgentContext:
        return self._context

    @context.setter
    def context(self, ctx: AgentContext) -> None:
        self._context = ctx

    @property
    def permission(self) -> PermissionConfig:
        return self._permission

    def check_tool(self, tool: ToolPermission) -> bool:
        return self._permission.allows_tool(tool)

    def check_read(self, resource: str) -> bool:
        return self._permission.allows_read(resource)

    def check_write(self, resource: str) -> bool:
        return self._permission.allows_write(resource)

    def ensure_can_tool(self, tool: ToolPermission) -> None:
        if not self.check_tool(tool):
            raise PermissionError(f"Agent '{self._name}' has no permission to use '{tool.value}'")

    def ensure_can_read(self, resource: str) -> None:
        if not self.check_read(resource):
            raise PermissionError(f"Agent '{self._name}' has no read permission for '{resource}'")

    def ensure_can_write(self, resource: str) -> None:
        if not self.check_write(resource):
            raise PermissionError(f"Agent '{self._name}' has no write permission for '{resource}'")

    async def start(self) -> None:
        if self._state not in (AgentState.CREATED, AgentState.STOPPED):
            raise RuntimeError(f"Cannot start agent from state {self._state}")
        logger.info("agent_start name=%s", self._name)
        self._state = AgentState.RUNNING
        await self._on_start()

    async def stop(self) -> None:
        if self._state == AgentState.STOPPED:
            return
        logger.info("agent_stop name=%s", self._name)
        self._state = AgentState.STOPPED
        await self._on_stop()

    async def pause(self) -> None:
        if self._state != AgentState.RUNNING:
            raise RuntimeError(f"Cannot pause agent from state {self._state}")
        logger.info("agent_pause name=%s", self._name)
        self._state = AgentState.PAUSED
        await self._on_pause()

    async def resume(self) -> None:
        if self._state != AgentState.PAUSED:
            raise RuntimeError(f"Cannot resume agent from state {self._state}")
        logger.info("agent_resume name=%s", self._name)
        self._state = AgentState.RUNNING
        await self._on_resume()

    async def read_memory(
        self, user_id: int, kb_id: int, query: str, top_k: int = 10
    ) -> list[MemoryItem]:
        if not self.check_tool(ToolPermission.MEMORY_READ):
            logger.warning("agent_read_memory_denied name=%s", self._name)
            return []
        if self._memory_client is None:
            return []
        try:
            return await self._memory_client.search_long_term(
                user_id=user_id, kb_id=kb_id, query=query, top_k=top_k
            )
        except Exception as exc:
            logger.warning("agent_read_memory_failed name=%s err=%s", self._name, exc)
            return []

    async def write_memory(
        self, user_id: int, kb_id: int, candidates: list[MemoryCandidate]
    ) -> WritebackResult:
        if not self.check_tool(ToolPermission.MEMORY_WRITE):
            logger.warning("agent_write_memory_denied name=%s", self._name)
            return WritebackResult(accepted=0, rejected=0, message="permission_denied")
        if self._memory_client is None:
            return WritebackResult(accepted=0, rejected=0, message="no_memory_client")
        try:
            return await self._memory_client.upsert_candidates(
                user_id=user_id, kb_id=kb_id, candidates=candidates
            )
        except Exception as exc:
            logger.warning("agent_write_memory_failed name=%s err=%s", self._name, exc)
            return WritebackResult(accepted=0, rejected=len(candidates), message=str(exc))

    async def call_llm(self, messages: list[dict[str, str]], **kwargs) -> str:
        if not self.check_tool(ToolPermission.LLM):
            raise PermissionError(f"Agent '{self._name}' has no permission to use LLM")
        if self._llm_provider is None:
            raise RuntimeError("no_llm_provider")
        from llm.base_provider import ChatMessage

        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
        chunks: list[str] = []
        async for chunk in self._llm_provider.stream_chat(chat_messages):
            chunks.append(chunk)
        return "".join(chunks)

    async def call_tool(self, tool_name: str, **kwargs) -> ToolCallResult:
        tool = self._tools.get(tool_name)
        if tool is None:
            return ToolCallResult(tool_name=tool_name, success=False, result="", error="tool_not_found")
        try:
            result = await tool(**kwargs)
            return ToolCallResult(tool_name=tool_name, success=True, result=str(result))
        except Exception as exc:
            logger.warning("agent_tool_call_failed name=%s tool=%s err=%s", self._name, tool_name, exc)
            return ToolCallResult(tool_name=tool_name, success=False, result="", error=str(exc))

    def register_tool(self, name: str, tool: Any) -> None:
        self._tools[name] = tool

    async def submit_task(
        self,
        user_id: int,
        kb_id: int,
        session_id: int,
        turn_id: str,
        user_text: str | None = None,
        assistant_text: str | None = None,
        recent_messages: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        if not self.check_tool(ToolPermission.TASK_SUBMIT):
            logger.warning("agent_submit_task_denied name=%s", self._name)
            return {}
        if self._memory_client is None:
            return {}
        try:
            return await self._memory_client.submit_memory_task(
                user_id=user_id,
                kb_id=kb_id,
                session_id=session_id,
                turn_id=turn_id,
                user_text=user_text,
                assistant_text=assistant_text,
                recent_messages=recent_messages,
            )
        except Exception as exc:
            logger.warning("agent_submit_task_failed name=%s err=%s", self._name, exc)
            return {}

    async def fetch_pending_tasks(self, limit: int = 10) -> list[dict[str, Any]]:
        self.ensure_can_tool(ToolPermission.MEMORY_READ)
        self.ensure_can_read("memory")
        if self._memory_client is None:
            raise RuntimeError("no_memory_client")
        return await self._memory_client.fetch_pending_tasks(limit=limit)

    async def upsert_candidates(
        self, user_id: int, kb_id: int, candidates: list[MemoryCandidate]
    ) -> WritebackResult:
        self.ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self.ensure_can_write("memory")
        if self._memory_client is None:
            raise RuntimeError("no_memory_client")
        return await self._memory_client.upsert_candidates(
            user_id=user_id, kb_id=kb_id, candidates=candidates
        )

    async def save_session_summary(self, session_id: int, summary: str) -> None:
        self.ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self.ensure_can_write("memory")
        if self._memory_client is None:
            raise RuntimeError("no_memory_client")
        await self._memory_client.save_session_summary(session_id=session_id, summary=summary)

    async def mark_task_done(self, task_id: int) -> None:
        self.ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self.ensure_can_write("memory")
        if self._memory_client is None:
            raise RuntimeError("no_memory_client")
        await self._memory_client.mark_task_done(task_id)

    async def mark_task_failed(self, task_id: int, error: str | None = None) -> None:
        self.ensure_can_tool(ToolPermission.MEMORY_WRITE)
        self.ensure_can_write("memory")
        if self._memory_client is None:
            raise RuntimeError("no_memory_client")
        await self._memory_client.mark_task_failed(task_id, error)

    async def run_once(self) -> dict[str, Any]:
        raise NotImplementedError

    async def run(self) -> None:
        raise NotImplementedError

    async def _on_start(self) -> None:
        pass

    async def _on_stop(self) -> None:
        pass

    async def _on_pause(self) -> None:
        pass

    async def _on_resume(self) -> None:
        pass
