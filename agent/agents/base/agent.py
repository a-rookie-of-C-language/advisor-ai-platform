from __future__ import annotations

import logging
from typing import Awaitable, Callable

from agents.base.AgentContext import AgentContext
from agents.base.AgentState import AgentState
from agents.base.ToolCallResult import ToolCallResult
from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryItem import MemoryItem
from context.memory.core.WritebackResult import WritebackResult
from json_types import JsonObject, JsonValue
from llm.base_provider import BaseLLMProvider
from tools.tool_permission import PermissionConfig, ToolPermission
from agents.base.agent_llm_support import (
    call_llm_json_response,
    call_llm_text,
    call_registered_tool,
)
from agents.base.agent_memory_support import (
    read_memory_with_policy,
    submit_memory_task_with_policy,
    write_memory_with_policy,
)
from agents.base.agent_memory_operations import AgentMemoryOperations

logger = logging.getLogger(__name__)


class Agent:
    def __init__(
        self,
        name: str,
        llm_provider: BaseLLMProvider | None = None,
        memory_client: MemoryApiClient | None = None,
        tools: dict[str, Callable[..., Awaitable[JsonValue]]] | None = None,
        permission_config: PermissionConfig | None = None,
    ) -> None:
        self._name = name
        self._state = AgentState.CREATED
        self._llm_provider = llm_provider
        self._memory_client = memory_client
        self._tools = tools or {}
        self._context = AgentContext()
        self._permission = permission_config or PermissionConfig()
        self._memory_operations = AgentMemoryOperations(
            memory_client=self._memory_client,
            ensure_can_tool=self.ensure_can_tool,
            ensure_can_read=self.ensure_can_read,
            ensure_can_write=self.ensure_can_write,
        )
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
        return await read_memory_with_policy(
            self._memory_client,
            agent_name=self._name,
            allowed=self.check_tool(ToolPermission.MEMORY_READ),
            user_id=user_id,
            kb_id=kb_id,
            query=query,
            top_k=top_k,
            logger=logger,
        )

    async def write_memory(
        self, user_id: int, kb_id: int, candidates: list[MemoryCandidate]
    ) -> WritebackResult:
        return await write_memory_with_policy(
            self._memory_client,
            agent_name=self._name,
            allowed=self.check_tool(ToolPermission.MEMORY_WRITE),
            user_id=user_id,
            kb_id=kb_id,
            candidates=candidates,
            logger=logger,
        )

    async def call_llm(self, messages: list[dict[str, str]], **kwargs) -> str:
        if not self.check_tool(ToolPermission.LLM):
            raise PermissionError(f"Agent '{self._name}' has no permission to use LLM")
        if self._llm_provider is None:
            raise RuntimeError("no_llm_provider")
        return await call_llm_text(self._llm_provider, messages, **kwargs)

    async def call_llm_json(
        self,
        messages: list[dict[str, str]],
        *,
        max_retries: int = 2,
        **kwargs,
    ) -> JsonObject:
        """调用 LLM 并解析 JSON 响应，解析失败时自动重试（FSM 模式）。

        Args:
            messages: 对话消息列表
            max_retries: JSON 解析失败最大重试次数
            **kwargs: 传递给 stream_chat 的额外参数

        Returns:
            解析后的 dict

        Raises:
            RuntimeError: 超过最大重试次数仍解析失败
        """
        return await call_llm_json_response(
            self.call_llm,
            messages,
            agent_name=self._name,
            logger=logger,
            max_retries=max_retries,
            **kwargs,
        )

    async def call_tool(self, tool_name: str, **kwargs) -> ToolCallResult:
        return await call_registered_tool(
            self._tools,
            agent_name=self._name,
            tool_name=tool_name,
            logger=logger,
            **kwargs,
        )

    def register_tool(self, name: str, tool: Callable[..., Awaitable[JsonValue]]) -> None:
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
    ) -> JsonObject:
        return await submit_memory_task_with_policy(
            self._memory_client,
            agent_name=self._name,
            allowed=self.check_tool(ToolPermission.TASK_SUBMIT),
            user_id=user_id,
            kb_id=kb_id,
            session_id=session_id,
            turn_id=turn_id,
            user_text=user_text,
            assistant_text=assistant_text,
            recent_messages=recent_messages,
            logger=logger,
        )

    async def fetch_pending_tasks(self, limit: int = 10) -> list[JsonObject]:
        return await self._memory_operations.fetch_pending_tasks(limit=limit)

    async def upsert_candidates(
        self, user_id: int, kb_id: int, candidates: list[MemoryCandidate]
    ) -> WritebackResult:
        return await self._memory_operations.upsert_candidates(
            user_id=user_id, kb_id=kb_id, candidates=candidates
        )

    async def save_session_summary(self, session_id: int, summary: str) -> None:
        await self._memory_operations.save_session_summary(session_id=session_id, summary=summary)

    async def mark_task_done(self, task_id: int) -> None:
        await self._memory_operations.mark_task_done(task_id)

    async def mark_task_failed(self, task_id: int, error: str | None = None) -> None:
        await self._memory_operations.mark_task_failed(task_id, error)

    async def run_once(self) -> JsonObject:
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
