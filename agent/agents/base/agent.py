from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator

from memory.core.schema import MemoryCandidate, MemoryItem, WritebackResult

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
    """Agent基类

    核心能力：
    - 生命周期管理：start / stop / pause / resume
    - LLM调用能力：通过 llm 模块的 provider 进行推理
    - 工具调用能力：注册和调用工具
    - 记忆访问能力：读写记忆系统
    """

    def __init__(
        self,
        name: str,
        llm_provider: Any = None,
        memory_client: Any = None,
        tools: dict[str, Any] | None = None,
    ) -> None:
        self._name = name
        self._state = AgentState.CREATED
        self._llm_provider = llm_provider
        self._memory_client = memory_client
        self._tools = tools or {}
        self._context = AgentContext()
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
        """读取记忆"""
        if self._memory_client is None:
            return []
        try:
            return await self._memory_client.search_memory(
                user_id=user_id, kb_id=kb_id, query=query, top_k=top_k
            )
        except Exception as exc:
            logger.warning("agent_read_memory_failed name=%s err=%s", self._name, exc)
            return []

    async def write_memory(
        self, user_id: int, kb_id: int, candidates: list[MemoryCandidate]
    ) -> WritebackResult:
        """写入记忆"""
        if self._memory_client is None:
            return WritebackResult(accepted=0, rejected=0, message="no_memory_client")
        try:
            return await self._memory_client.save_memory_candidates(
                user_id=user_id, kb_id=kb_id, candidates=candidates
            )
        except Exception as exc:
            logger.warning("agent_write_memory_failed name=%s err=%s", self._name, exc)
            return WritebackResult(accepted=0, rejected=len(candidates), message=str(exc))

    async def call_llm(self, messages: list[dict[str, str]], **kwargs) -> str:
        """调用LLM"""
        if self._llm_provider is None:
            raise RuntimeError("no_llm_provider")
        from llm.base_provider import ChatMessage

        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
        chunks: list[str] = []
        async for chunk in self._llm_provider.stream_chat(chat_messages):
            chunks.append(chunk)
        return "".join(chunks)

    async def call_tool(self, tool_name: str, **kwargs) -> ToolCallResult:
        """调用工具"""
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
        """注册工具"""
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
        """提交记忆任务到后端"""
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

    async def run_once(self) -> dict[str, Any]:
        """执行一次任务，由子类实现"""
        raise NotImplementedError

    async def run(self) -> None:
        """持续运行，由子类实现"""
        raise NotImplementedError

    async def _on_start(self) -> None:
        pass

    async def _on_stop(self) -> None:
        pass

    async def _on_pause(self) -> None:
        pass

    async def _on_resume(self) -> None:
        pass
