from __future__ import annotations

import asyncio
from typing import Any, AsyncIterator, Awaitable, Callable, Iterable

from json_types import JsonObject
from llm.base_provider import ToolExecutor
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.openai_request_kwargs import build_tool_round_kwargs
from llm.openai_stream_recovery import (
    MAX_TRUNCATION_RECOVERY_ATTEMPTS,
    TRUNCATION_RECOVERY_MESSAGE,
)
from llm.tool_call_runner import encode_tool_calls, parse_tool_output_json, run_tool_call
from llm.tool_spec import ToolSpec
from llm.with_retry import call_with_retry


class OpenAIToolChatStreamer:
    def __init__(
        self,
        *,
        client: Any,
        model: str,
        temperature: float,
        max_retries: int,
        tool_round_timeout_sec: float,
        build_message_payload: Callable[[ChatMessage], dict[str, Any]],
        to_tool_payload: Callable[[list[ToolSpec]], list[JsonObject]],
        chunk_text: Callable[[str, int], list[str]],
        logger: Any,
    ) -> None:
        self._client = client
        self._model = model
        self._temperature = temperature
        self._max_retries = max_retries
        self._tool_round_timeout_sec = tool_round_timeout_sec
        self._build_message_payload = build_message_payload
        self._to_tool_payload = to_tool_payload
        self._chunk_text = chunk_text
        self._logger = logger

    async def stream(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor: ToolExecutor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
        on_tool_result: Callable[[str, JsonObject], Awaitable[list[ToolSpec] | None]] | None = None,
    ) -> AsyncIterator[LLMStreamEvent]:
        active_tools = list(tools)
        conversation: list[dict[str, Any]] = [
            self._build_message_payload(message) for message in messages
        ]
        tool_payload = self._to_tool_payload(active_tools)
        tool_call_count = 0
        max_tokens_bumped = False
        recovery_attempts = 0

        while True:
            tool_choice: JsonObject | str = "auto"
            bumped = max_tokens_bumped
            current_tool_payload = tool_payload

            async def create_response(
                current_tool_choice: JsonObject | str = tool_choice,
                bumped: bool = bumped,
                current_tool_payload: list[JsonObject] = current_tool_payload,
            ):
                kwargs = build_tool_round_kwargs(
                    model=self._model,
                    messages=conversation,
                    temperature=self._temperature,
                    tools=current_tool_payload,
                    tool_choice=current_tool_choice,
                    max_tokens_bumped=bumped,
                )
                return await asyncio.wait_for(
                    self._client.chat.completions.create(**kwargs),
                    timeout=self._tool_round_timeout_sec,
                )

            response = await call_with_retry(
                create_response,
                max_retries=self._max_retries,
                operation_name="llm_tool_round",
                logger=self._logger,
            )

            if not response.choices:
                raise RuntimeError("LLM returned empty choices (possibly content filter)")
            choice = response.choices[0]
            assistant_message = choice.message
            assistant_content = assistant_message.content or ""
            raw_tool_calls = assistant_message.tool_calls or []

            if raw_tool_calls and tool_call_count < max_tool_calls:
                conversation.append(
                    {
                        "role": "assistant",
                        "content": assistant_content or None,
                        "tool_calls": encode_tool_calls(raw_tool_calls),
                    }
                )

                async for event in self._run_tool_calls(
                    raw_tool_calls,
                    conversation,
                    tool_executor,
                    max_tool_retries,
                    active_tools,
                    on_tool_result,
                ):
                    yield event

                tool_payload = self._to_tool_payload(active_tools)

                tool_call_count += 1
                continue

            choice_finish = getattr(choice, "finish_reason", None)
            if choice_finish == "length":
                if not max_tokens_bumped:
                    max_tokens_bumped = True
                    self._logger.info(
                        "llm_tool_output_truncated: level=1 bump_max_tokens model=%s",
                        self._model,
                    )
                    continue
                if recovery_attempts < MAX_TRUNCATION_RECOVERY_ATTEMPTS:
                    recovery_attempts += 1
                    conversation.append({"role": "user", "content": TRUNCATION_RECOVERY_MESSAGE})
                    self._logger.info(
                        "llm_tool_output_truncated: level=2 recovery_attempt=%s/%s model=%s",
                        recovery_attempts,
                        MAX_TRUNCATION_RECOVERY_ATTEMPTS,
                        self._model,
                    )
                    continue
                self._logger.warning(
                    "llm_tool_output_truncated: level=3 exhausted model=%s",
                    self._model,
                )

            final_text = assistant_content.strip()
            for piece in self._chunk_text(final_text, 32):
                yield LLMStreamEvent(type="delta", text=piece)
            break

    async def _run_tool_calls(
        self,
        raw_tool_calls: list[Any],
        conversation: list[dict[str, Any]],
        tool_executor: ToolExecutor,
        max_tool_retries: int,
        tools: list[ToolSpec],
        on_tool_result: Callable[[str, JsonObject], Awaitable[list[ToolSpec] | None]] | None,
    ) -> AsyncIterator[LLMStreamEvent]:
        for raw_call in raw_tool_calls:
            tool_call_result = await run_tool_call(
                raw_call,
                tool_executor=tool_executor,
                max_tool_retries=max_tool_retries,
            )
            for event in tool_call_result.events:
                yield event

            conversation.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_result.tool_call_id,
                    "content": tool_call_result.tool_output,
                }
            )

            if on_tool_result is not None:
                parsed_output = parse_tool_output_json(tool_call_result.tool_output)
                new_specs = await on_tool_result(tool_call_result.tool_name, parsed_output)
                if new_specs:
                    tools.extend(new_specs)
                    self._logger.info(
                        "llm_tools_extended: added=%s total=%s",
                        len(new_specs),
                        len(tools),
                    )
