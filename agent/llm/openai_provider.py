from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import AsyncIterator, Awaitable, Callable, Iterable, Literal, Protocol

from openai import AsyncOpenAI

from json_types import JsonObject
from llm.base_provider import BaseLLMProvider, ToolExecutor
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.thinking_config import ThinkingConfig
from llm.tool_call_fsm import ToolCallFSM
from llm.tool_spec import ToolSpec
from llm.with_retry import (
    StreamIdleError,
    call_with_retry,
    is_retryable_llm_error,
    retry_delay_seconds,
)
from prompt.PromptBuilder import PromptBuilder

logger = logging.getLogger(__name__)


class OpenAIToolCallFunction(Protocol):
    name: str
    arguments: str | None


class OpenAIToolCall(Protocol):
    id: str
    function: OpenAIToolCallFunction


@dataclass
class TrackedTool:
    """跟踪单个工具调用的状态"""

    raw_call: OpenAIToolCall  # 原始 tool_call 对象
    tool_name: str
    args_text: str
    fsm: ToolCallFSM
    is_concurrency_safe: bool = False
    is_read_only: bool = True
    status: Literal["queued", "executing", "completed", "cancelled"] = "queued"
    tool_output: str = ""
    success: bool = False
    used_attempt: int = 0
    is_cascade_error: bool = False  # 是否因级联错误被取消


class ToolScheduler:
    """工具并发调度器，支持并发安全和错误级联"""

    def __init__(
        self,
        tool_executor: ToolExecutor,
        max_retries: int,
        tool_specs: dict[str, ToolSpec],
        abort_event: asyncio.Event,
    ) -> None:
        self._tool_executor = tool_executor
        self._max_retries = max_retries
        self._tool_specs = tool_specs
        self._abort_event = abort_event
        self._executing: list[TrackedTool] = []
        self._lock = asyncio.Lock()
        self._has_critical_error = False

    def get_tool_spec(self, tool_name: str) -> ToolSpec | None:
        """根据工具名查找 ToolSpec"""
        return self._tool_specs.get(tool_name)

    def can_execute_concurrent(self, tool: TrackedTool) -> bool:
        """判断工具是否可以并发执行"""
        if not tool.is_concurrency_safe:
            return False
        return all(t.is_concurrency_safe for t in self._executing)

    async def execute_tools(
        self,
        tools: list[TrackedTool],
        yield_func: Callable[[LLMStreamEvent], Awaitable[None]],
        conversation: list[JsonObject],
    ) -> list[TrackedTool]:
        """执行工具调用列表，支持并发调度和错误级联"""
        results: list[TrackedTool] = []

        # 分组：并发安全的只读工具 vs 其他
        concurrent_tools = [t for t in tools if t.is_concurrency_safe and t.is_read_only]
        serial_tools = [t for t in tools if not t.is_concurrency_safe or not t.is_read_only]

        # 1. 先并行执行并发安全的只读工具
        if concurrent_tools:
            await self._execute_concurrent(concurrent_tools, yield_func)
            results.extend(concurrent_tools)

        # 2. 如果有严重错误，跳过串行工具
        if self._has_critical_error:
            for tool in serial_tools:
                tool.status = "cancelled"
                tool.is_cascade_error = True
                tool.tool_output = json.dumps(
                    {
                        "ok": False,
                        "status": "error",
                        "message": "cancelled: sibling tool failed",
                        "items": [],
                    },
                    ensure_ascii=False,
                )
                tool.success = False
                results.append(tool)
            return results

        # 3. 串行执行非并发安全或非只读的工具
        for tool in serial_tools:
            if self._abort_event.is_set():
                tool.status = "cancelled"
                tool.is_cascade_error = True
                tool.tool_output = json.dumps(
                    {
                        "ok": False,
                        "status": "error",
                        "message": "cancelled: aborted",
                        "items": [],
                    },
                    ensure_ascii=False,
                )
                tool.success = False
                results.append(tool)
                continue

            await self._execute_single(tool, yield_func)
            results.append(tool)

            # 错误级联：非只读工具失败时设置 abort 标志
            if not tool.success and not tool.is_read_only:
                self._has_critical_error = True
                self._abort_event.set()

        return results

    async def _execute_concurrent(
        self,
        tools: list[TrackedTool],
        yield_func: Callable[[LLMStreamEvent], Awaitable[None]],
    ) -> None:
        """并行执行一组并发安全的工具"""
        if not tools:
            return

        async def execute_one(tool: TrackedTool) -> TrackedTool:
            async with self._lock:
                if self._abort_event.is_set():
                    tool.status = "cancelled"
                    tool.is_cascade_error = True
                    return tool
                tool.status = "executing"
                self._executing.append(tool)

            try:
                await yield_func(
                    LLMStreamEvent(
                        type="tool_call",
                        tool_name=tool.tool_name,
                        tool_args=tool.fsm.context.tool_args,
                    )
                )

                last_error = ""
                for attempt in range(1, self._max_retries + 1):
                    tool.used_attempt = attempt
                    try:
                        tool.tool_output = await self._tool_executor(
                            tool.tool_name, tool.fsm.context.tool_args
                        )
                        tool.success = True
                        tool.fsm.record_execution(tool.tool_output, success=True)
                        break
                    except Exception as exc:  # noqa: BLE001
                        last_error = str(exc)
                        tool.fsm.record_execution(str(exc), success=False)
                        if tool.fsm.state.value == "failed":
                            break

                if not tool.success:
                    tool.tool_output = json.dumps(
                        {
                            "ok": False,
                            "status": "error",
                            "message": f"tool_execute_failed: {last_error}",
                            "items": [],
                        },
                        ensure_ascii=False,
                    )
            finally:
                async with self._lock:
                    self._executing.remove(tool)
                    tool.status = "completed"

                await yield_func(
                    LLMStreamEvent(
                        type="tool_result",
                        tool_name=tool.tool_name,
                        tool_args=tool.fsm.context.tool_args,
                        tool_output=tool.tool_output,
                        attempt=tool.used_attempt,
                        success=tool.success,
                    )
                )

            return tool

        await asyncio.gather(*[execute_one(t) for t in tools], return_exceptions=False)

    async def _execute_single(
        self,
        tool: TrackedTool,
        yield_func: Callable[[LLMStreamEvent], Awaitable[None]],
    ) -> TrackedTool:
        """执行单个工具"""
        tool.status = "executing"
        async with self._lock:
            self._executing.append(tool)

        try:
            await yield_func(
                LLMStreamEvent(
                    type="tool_call",
                    tool_name=tool.tool_name,
                    tool_args=tool.fsm.context.tool_args,
                )
            )

            last_error = ""
            for attempt in range(1, self._max_retries + 1):
                tool.used_attempt = attempt
                try:
                    tool.tool_output = await self._tool_executor(
                        tool.tool_name, tool.fsm.context.tool_args
                    )
                    tool.success = True
                    tool.fsm.record_execution(tool.tool_output, success=True)
                    break
                except Exception as exc:  # noqa: BLE001
                    last_error = str(exc)
                    tool.fsm.record_execution(str(exc), success=False)
                    if tool.fsm.state.value == "failed":
                        break

            if not tool.success:
                tool.tool_output = json.dumps(
                    {
                        "ok": False,
                        "status": "error",
                        "message": f"tool_execute_failed: {last_error}",
                        "items": [],
                    },
                    ensure_ascii=False,
                )
        finally:
            async with self._lock:
                self._executing.remove(tool)
                tool.status = "completed"

            await yield_func(
                LLMStreamEvent(
                    type="tool_result",
                    tool_name=tool.tool_name,
                    tool_args=tool.fsm.context.tool_args,
                    tool_output=tool.tool_output,
                    attempt=tool.used_attempt,
                    success=tool.success,
                )
            )

        return tool


class OpenAIProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
        temperature: float = 0.2,
        timeout: float = 60.0,
        max_retries: int = 0,
        stream_timeout_sec: float = 45.0,
        tool_round_timeout_sec: float = 30.0,
        stream_idle_timeout_sec: float = 90.0,
        thinking_config: ThinkingConfig | None = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._timeout = timeout
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=0,
        )
        self._model = model
        self._temperature = temperature
        self._max_retries = max(0, max_retries)
        self._stream_timeout_sec = max(5.0, stream_timeout_sec)
        self._tool_round_timeout_sec = max(5.0, tool_round_timeout_sec)
        self._stream_idle_timeout_sec = max(10.0, stream_idle_timeout_sec)
        self._thinking_config = thinking_config or ThinkingConfig.disabled()

    def get_client(self) -> AsyncOpenAI:
        return self._client

    def get_model_name(self) -> str:
        return self._model

    def with_model(self, model: str) -> "OpenAIProvider":
        return OpenAIProvider(
            api_key=self._api_key,
            model=model,
            base_url=self._base_url,
            temperature=self._temperature,
            timeout=self._timeout,
            max_retries=self._max_retries,
            stream_timeout_sec=self._stream_timeout_sec,
            tool_round_timeout_sec=self._tool_round_timeout_sec,
            stream_idle_timeout_sec=self._stream_idle_timeout_sec,
            thinking_config=self._thinking_config,
        )

    @staticmethod
    def _chunk_text(text: str, size: int = 32) -> list[str]:
        if not text:
            return []
        return [text[idx : idx + size] for idx in range(0, len(text), size)]

    @staticmethod
    def _to_tool_payload(tools: list[ToolSpec], *, strict: bool = False) -> list[JsonObject]:
        return PromptBuilder.build_tool_payload(tools, strict=strict)

    async def stream_chat(
        self,
        messages: Iterable[ChatMessage],
        *,
        response_format: JsonObject | None = None,
        on_reasoning: Callable[[str], Awaitable[None]] | None = None,
    ) -> AsyncIterator[str]:
        payload: list[JsonObject] = [
            {"role": message.role, "content": message.content}
            for message in messages
        ]

        kwargs: JsonObject = {
            "model": self._model,
            "messages": payload,
            "temperature": self._temperature,
            "stream": True,
        }
        if response_format is not None:
            kwargs["response_format"] = response_format
        kwargs.update(self._thinking_config.to_request_kwargs())

        max_tokens_bumped = False
        recovery_attempts = 0
        _max_recovery_attempts = 3
        _recovery_message = "你被截断了，不要道歉、不要回顾，直接从中断处继续。"

        while True:  # 恢复循环：处理输出截断
            attempt = 0
            while True:  # 重试循环：处理网络/限流等瞬态错误
                yielded = False
                finish_reason: str | None = None
                try:
                    stream = await asyncio.wait_for(
                        self._client.chat.completions.create(**kwargs),
                        timeout=self._stream_timeout_sec,
                    )
                    stream_iter = stream.__aiter__()
                    while True:
                        try:
                            chunk = await asyncio.wait_for(
                                stream_iter.__anext__(),
                                timeout=self._stream_idle_timeout_sec,
                            )
                        except StopAsyncIteration:
                            break
                        except asyncio.TimeoutError as timeout_exc:
                            raise StreamIdleError(
                                f"流空闲超过 {self._stream_idle_timeout_sec:.0f} 秒，自动重试"
                            ) from timeout_exc
                        if chunk.choices:
                            choice = chunk.choices[0]
                            if hasattr(choice, "finish_reason") and choice.finish_reason:
                                finish_reason = choice.finish_reason
                            # 思考模式：reasoning_content 通过回调流式输出
                            # DeepSeek-R1 等模型使用 reasoning_content，需要检查属性存在性
                            if hasattr(choice.delta, "reasoning_content"):
                                reasoning = choice.delta.reasoning_content
                                if reasoning and on_reasoning is not None:
                                    await on_reasoning(reasoning)
                            delta = choice.delta.content
                            if delta:
                                yielded = True
                                yield delta

                    # 流正常结束，检查是否因 max_tokens 被截断
                    if finish_reason == "length":
                        if not max_tokens_bumped:
                            kwargs["max_tokens"] = 65536
                            max_tokens_bumped = True
                            logger.info(
                                "llm_output_truncated: level=1 bump_max_tokens model=%s",
                                self._model,
                            )
                            break  # 跳出重试循环 → 恢复循环用新参数重试
                        if recovery_attempts < _max_recovery_attempts:
                            recovery_attempts += 1
                            payload.append({"role": "user", "content": _recovery_message})
                            logger.info(
                                "llm_output_truncated: level=2 recovery_attempt=%s/%s model=%s",
                                recovery_attempts,
                                _max_recovery_attempts,
                                self._model,
                            )
                            break  # 跳出重试循环 → 恢复循环注入消息重试
                        logger.warning(
                            "llm_output_truncated: level=3 exhausted model=%s",
                            self._model,
                        )
                    return
                except Exception as exc:
                    if yielded or attempt >= self._max_retries or not is_retryable_llm_error(exc):
                        raise
                    attempt += 1
                    delay = retry_delay_seconds(attempt)
                    logger.warning(
                        "llm_stream_retry: model=%s attempt=%s max_retries=%s delay=%.1f",
                        self._model,
                        attempt,
                        self._max_retries,
                        delay,
                    )
                    await asyncio.sleep(delay)

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor: ToolExecutor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        strict_tools: bool = False,
        on_tool_result: Callable[[str, JsonObject], Awaitable[list[ToolSpec] | None]] | None = None,
    ) -> AsyncIterator[LLMStreamEvent]:
        if not tools:
            async for chunk in self.stream_chat(messages):
                yield LLMStreamEvent(type="delta", text=chunk)
            return

        conversation: list[JsonObject] = [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]
        tool_payload = self._to_tool_payload(tools, strict=strict_tools)
        tool_call_count = 0
        max_tokens_bumped = False
        recovery_attempts = 0
        _max_recovery_attempts = 3
        _recovery_message = "你被截断了，不要道歉、不要回顾，直接从中断处继续。"

        while True:
            tool_choice: JsonObject | str = "auto"

            # 捕获当前恢复状态与工具定义用于闭包内 create_response
            _bumped = max_tokens_bumped
            _tool_payload = tool_payload

            async def create_response(
                current_tool_choice: JsonObject | str = tool_choice,
                _bumped: bool = _bumped,  # noqa: B008
                _tool_payload: list[JsonObject] = _tool_payload,  # noqa: B008
            ):
                kwargs: JsonObject = {
                    "model": self._model,
                    "messages": conversation,
                    "temperature": self._temperature,
                    "stream": False,
                    "tools": _tool_payload,
                    "tool_choice": current_tool_choice,
                }
                if _bumped:
                    kwargs["max_tokens"] = 65536
                return await asyncio.wait_for(
                    self._client.chat.completions.create(**kwargs),
                    timeout=self._tool_round_timeout_sec,
                )

            response = await call_with_retry(
                create_response,
                max_retries=self._max_retries,
                operation_name="llm_tool_round",
                logger=logger,
            )

            if not response.choices:
                raise RuntimeError("LLM returned empty choices (possibly content filter)")
            choice = response.choices[0]
            assistant_message = choice.message
            assistant_content = assistant_message.content or ""
            raw_tool_calls = assistant_message.tool_calls or []

            if raw_tool_calls and tool_call_count < max_tool_calls:
                encoded_tool_calls = []
                for raw_call in raw_tool_calls:
                    encoded_tool_calls.append(
                        {
                            "id": raw_call.id,
                            "type": "function",
                            "function": {
                                "name": raw_call.function.name,
                                "arguments": raw_call.function.arguments or "{}",
                            },
                        }
                    )
                conversation.append(
                    {
                        "role": "assistant",
                        "content": assistant_content or None,
                        "tool_calls": encoded_tool_calls,
                    }
                )

                for raw_call in raw_tool_calls:
                    tool_name = raw_call.function.name
                    args_text = raw_call.function.arguments or "{}"
                    fsm = ToolCallFSM(
                        tool_name,
                        args_text,
                        max_args_retries=2,
                        max_exec_retries=max_tool_retries,
                    )

                    # --- 闃舵涓€锛氬弬鏁拌В鏋愪笌楠岃瘉 ---
                    try:
                        tool_args = json.loads(args_text)
                    except Exception:
                        tool_args = None  # type: ignore[assignment]

                    if not fsm.validate_args(tool_args):
                        # FSM 进入 ARGS_RETRY 或 FAILED
                        if fsm.state.value == "args_retry":
                            # 参数格式错误，先回传错误结果，等待下一轮修正
                            error_output = json.dumps(
                                {
                                    "ok": False,
                                    "status": "error",
                                    "message": f"Invalid JSON in tool arguments: {args_text[:200]}",
                                    "items": [],
                                },
                                ensure_ascii=False,
                            )
                            yield LLMStreamEvent(
                                type="tool_call",
                                tool_name=tool_name,
                                tool_args={},
                            )
                            yield LLMStreamEvent(
                                type="tool_result",
                                tool_name=tool_name,
                                tool_args={},
                                tool_output=error_output,
                                attempt=0,
                                success=False,
                            )
                            conversation.append(
                                {
                                    "role": "tool",
                                    "tool_call_id": raw_call.id,
                                    "content": error_output,
                                }
                            )
                            continue

                        # 参数解析彻底失败
                        error_output = json.dumps(
                            {
                                "ok": False,
                                "status": "error",
                                "message": f"tool_args_parse_exhausted: {args_text[:200]}",
                                "items": [],
                            },
                            ensure_ascii=False,
                        )
                        yield LLMStreamEvent(
                            type="tool_call",
                            tool_name=tool_name,
                            tool_args={},
                        )
                        yield LLMStreamEvent(
                            type="tool_result",
                            tool_name=tool_name,
                            tool_args={},
                            tool_output=error_output,
                            attempt=fsm.context.attempt,
                            success=False,
                        )
                        conversation.append(
                            {
                                "role": "tool",
                                "tool_call_id": raw_call.id,
                                "content": error_output,
                            }
                        )
                        continue

                    # --- 闃舵浜岋細宸ュ叿鎵ц ---
                    yield LLMStreamEvent(
                        type="tool_call",
                        tool_name=tool_name,
                        tool_args=fsm.context.tool_args,
                    )

                    last_error = ""
                    tool_output = ""
                    success = False
                    used_attempt = 0
                    for attempt in range(1, max_tool_retries + 1):
                        used_attempt = attempt
                        try:
                            tool_output = await tool_executor(tool_name, fsm.context.tool_args)
                            success = True
                            fsm.record_execution(tool_output, success=True)
                            break
                        except Exception as exc:  # noqa: BLE001
                            last_error = str(exc)
                            fsm.record_execution(str(exc), success=False)
                            if fsm.state.value == "failed":
                                break

                    if not success:
                        tool_output = json.dumps(
                            {
                                "ok": False,
                                "status": "error",
                                "message": f"tool_execute_failed: {last_error}",
                                "items": [],
                            },
                            ensure_ascii=False,
                        )

                    yield LLMStreamEvent(
                        type="tool_result",
                        tool_name=tool_name,
                        tool_args=fsm.context.tool_args,
                        tool_output=tool_output,
                        attempt=used_attempt,
                        success=success,
                    )

                    conversation.append(
                        {
                            "role": "tool",
                            "tool_call_id": raw_call.id,
                            "content": tool_output,
                        }
                    )

                    # 动态工具注入：tool_search 返回新工具时扩展工具列表
                    if on_tool_result is not None:
                        try:
                            parsed_output = json.loads(tool_output) if tool_output else {}
                        except (json.JSONDecodeError, TypeError):
                            parsed_output = {}
                        new_specs = await on_tool_result(tool_name, parsed_output)
                        if new_specs:
                            tools = tools + new_specs
                            tool_payload = self._to_tool_payload(tools, strict=strict_tools)
                            logger.info(
                                "llm_tools_extended: added=%s total=%s",
                                len(new_specs),
                                len(tools),
                            )

                tool_call_count += 1
                continue

            # 无工具调用 — 检查输出是否被截断
            choice_finish = getattr(choice, "finish_reason", None)
            if choice_finish == "length":
                if not max_tokens_bumped:
                    max_tokens_bumped = True
                    logger.info(
                        "llm_tool_output_truncated: level=1 bump_max_tokens model=%s",
                        self._model,
                    )
                    continue
                if recovery_attempts < _max_recovery_attempts:
                    recovery_attempts += 1
                    conversation.append({"role": "user", "content": _recovery_message})
                    logger.info(
                        "llm_tool_output_truncated: level=2 recovery_attempt=%s/%s model=%s",
                        recovery_attempts,
                        _max_recovery_attempts,
                        self._model,
                    )
                    continue
                logger.warning(
                    "llm_tool_output_truncated: level=3 exhausted model=%s",
                    self._model,
                )

            final_text = assistant_content.strip()
            for piece in self._chunk_text(final_text, 32):
                yield LLMStreamEvent(type="delta", text=piece)
            break
