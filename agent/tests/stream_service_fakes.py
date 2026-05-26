from __future__ import annotations

import json
from types import SimpleNamespace
from typing import AsyncIterator, Iterable

from agents.tool_explorer import ToolExplorerEvent, ToolExplorerOutcome
from context.memory.core.MemoryContext import MemoryContext
from json_types import JsonValue
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.tool_spec import ToolSpec


class ProviderOk:
    def __init__(self, chunks: list[str]) -> None:
        self._chunks = chunks
        self.last_messages: list[ChatMessage] = []

    async def stream_chat(
        self, messages: Iterable[ChatMessage], **kwargs: JsonValue
    ) -> AsyncIterator[str]:
        self.last_messages = list(messages)
        for chunk in self._chunks:
            yield chunk

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        for chunk in self._chunks:
            yield LLMStreamEvent(type="delta", text=chunk)


class ProviderError:
    async def stream_chat(
        self, messages: Iterable[ChatMessage], **kwargs: JsonValue
    ) -> AsyncIterator[str]:
        if False:
            yield ""
        raise RuntimeError("provider boom")

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        raise RuntimeError("provider boom")


class ProviderToolUse:
    async def stream_chat(
        self, messages: Iterable[ChatMessage], **kwargs: JsonValue
    ) -> AsyncIterator[str]:
        if False:
            yield ""
        return

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tools
        _ = max_tool_calls
        _ = max_tool_retries
        payload = await tool_executor("rag_search", {"query": "q", "top_k": 3})
        yield LLMStreamEvent(
            type="tool_result",
            tool_name="rag_search",
            tool_output=payload,
            attempt=1,
            success=True,
        )
        yield LLMStreamEvent(type="delta", text="answer")


class ProviderLegacyToolUse(ProviderToolUse):
    pass


class ProviderRouteCapture:
    def __init__(self) -> None:
        self.last_tools: list[ToolSpec] = []

    async def stream_chat(
        self, messages: Iterable[ChatMessage], **kwargs: JsonValue
    ) -> AsyncIterator[str]:
        if False:
            yield ""
        return

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tool_executor
        _ = max_tool_calls
        _ = max_tool_retries
        _ = kwargs
        self.last_tools = list(tools)
        yield LLMStreamEvent(type="delta", text="answer")


class ProviderRouteJsonThenAnswer:
    async def stream_chat(
        self, messages: Iterable[ChatMessage], **kwargs: JsonValue
    ) -> AsyncIterator[str]:
        if kwargs.get("response_format"):
            yield json.dumps({"categories": [], "confidence": 0.0, "reason": "fallback"})
            return
        yield "这些学生包括张三、李四。"

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        **kwargs: JsonValue,
    ) -> AsyncIterator[LLMStreamEvent]:
        _ = messages
        _ = tools
        _ = tool_executor
        _ = max_tool_calls
        _ = max_tool_retries
        _ = kwargs
        yield LLMStreamEvent(type="delta", text="should not use main tool loop")


class CapturingOpenAIProvider:
    instances: list["CapturingOpenAIProvider"] = []

    def __init__(
        self,
        api_key,
        model,
        base_url=None,
        temperature=0.2,
        timeout=60.0,
        max_retries=0,
        stream_timeout_sec=45.0,
        tool_round_timeout_sec=30.0,
        stream_idle_timeout_sec=90.0,
        thinking_config=None,
    ) -> None:
        self.kwargs = {
            "api_key": api_key,
            "model": model,
            "base_url": base_url,
            "temperature": temperature,
            "timeout": timeout,
            "max_retries": max_retries,
            "stream_timeout_sec": stream_timeout_sec,
            "tool_round_timeout_sec": tool_round_timeout_sec,
            "stream_idle_timeout_sec": stream_idle_timeout_sec,
            "thinking_config": thinking_config,
        }
        self.model = model
        CapturingOpenAIProvider.instances.append(self)

    async def stream_chat(
        self, messages: Iterable[ChatMessage], **kwargs: JsonValue
    ) -> AsyncIterator[str]:
        _ = messages
        _ = kwargs
        if False:
            yield ""


class ExplorerUsed:
    async def explore(self, **kwargs: JsonValue) -> ToolExplorerOutcome:
        _ = kwargs
        return ToolExplorerOutcome(
            used=True,
            sufficient=True,
            summary="已查询学生名单。",
            evidence=[{"tool_name": "mcp__student__list_students", "items": [{"text": "张三、李四"}]}],
            tool_calls=[{"tool_name": "mcp__student__list_students", "arguments": {}}],
            events=[
                ToolExplorerEvent(
                    event="sys_tool_plan",
                    payload={
                        "step": 1,
                        "action": "call_tool",
                        "tool_name": "mcp__student__list_students",
                        "tool_call_id": "tool_explorer-1-mcp__student__list_students",
                        "arguments": {},
                        "reason": "追问学生名单",
                    },
                ),
                ToolExplorerEvent(
                    event="tool_use",
                    payload={
                        "tool_name": "mcp__student__list_students",
                        "tool_call_id": "tool_explorer-1-mcp__student__list_students",
                        "input": {},
                    },
                ),
                ToolExplorerEvent(
                    event="tool_result",
                    payload={
                        "tool_name": "mcp__student__list_students",
                        "tool_call_id": "tool_explorer-1-mcp__student__list_students",
                        "attempt": 1,
                        "status": "success",
                        "message": "共 2 条记录",
                        "output": {
                            "ok": True,
                            "status": "success",
                            "message": "共 2 条记录",
                            "items": [{"type": "text", "text": "张三、李四"}],
                        },
                    },
                ),
            ],
        )


class RagMiss:
    def rag_search(self, req):
        _ = req

        class _Res:
            ok = True
            items = []

        return _Res()


class RagHit:
    def rag_search(self, req):
        _ = req

        class _Res:
            ok = True
            items = [
                SimpleNamespace(
                    doc_id=1,
                    doc_title="高校辅导员素质能力提升",
                    text="辅导员能力建设应围绕思想政治、学生管理、心理辅导和就业指导展开。",
                    score=0.98,
                )
            ]

        return _Res()


class RagMustNotRun:
    def rag_search(self, req):
        _ = req
        raise AssertionError("rag_search should not run without permission context")


class MemoryOkFlushError:
    def __init__(self) -> None:
        self.load_called = 0
        self.flush_called = 0

    async def load(self, **kwargs) -> MemoryContext:
        self.load_called += 1
        return MemoryContext()

    async def flush(self, **kwargs) -> None:
        self.flush_called += 1
        raise RuntimeError("flush failed")


class MemoryLoadError:
    def __init__(self) -> None:
        self.load_called = 0
        self.flush_called = 0

    async def load(self, **kwargs) -> MemoryContext:
        self.load_called += 1
        raise RuntimeError("load failed")

    async def flush(self, **kwargs) -> None:
        self.flush_called += 1
