from __future__ import annotations

import json
from typing import Any, AsyncIterator, Iterable

from openai import AsyncOpenAI

from llm.base_provider import BaseLLMProvider, ChatMessage, LLMStreamEvent, ToolExecutor, ToolSpec


class OpenAIProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
        temperature: float = 0.2,
        timeout: float = 60.0,
    ) -> None:
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
        )
        self._model = model
        self._temperature = temperature
    @staticmethod
    def get_client(self) -> AsyncOpenAI:
        return self._client

    @staticmethod
    def _chunk_text(text: str, size: int = 32) -> list[str]:
        if not text:
            return []
        return [text[idx : idx + size] for idx in range(0, len(text), size)]

    @staticmethod
    def _to_tool_payload(tools: list[ToolSpec]) -> list[dict[str, Any]]:
        payload: list[dict[str, Any]] = []
        for tool in tools:
            payload.append(
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.parameters,
                    },
                }
            )
        return payload

    async def stream_chat(self, messages: Iterable[ChatMessage]) -> AsyncIterator[str]:
        payload = [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]

        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=payload,
            temperature=self._temperature,
            stream=True,
        )

        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def stream_chat_with_tools(
        self,
        messages: Iterable[ChatMessage],
        tools: list[ToolSpec],
        tool_executor: ToolExecutor,
        *,
        max_tool_calls: int = 1,
        max_tool_retries: int = 3,
    ) -> AsyncIterator[LLMStreamEvent]:
        if not tools:
            async for chunk in self.stream_chat(messages):
                yield LLMStreamEvent(type="delta", text=chunk)
            return

        conversation: list[dict[str, Any]] = [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]
        tool_payload = self._to_tool_payload(tools)
        tool_call_count = 0

        while True:
            tool_choice: dict[str, Any] | str = "auto"
            if tool_call_count == 0 and max_tool_calls > 0:
                tool_choice = {
                    "type": "function",
                    "function": {"name": tools[0].name},
                }

            response = await self._client.chat.completions.create(
                model=self._model,
                messages=conversation,
                temperature=self._temperature,
                stream=False,
                tools=tool_payload,
                tool_choice=tool_choice,
            )

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
                    try:
                        tool_args = json.loads(args_text)
                    except Exception:
                        tool_args = {}

                    yield LLMStreamEvent(
                        type="tool_call",
                        tool_name=tool_name,
                        tool_args=tool_args,
                    )

                    last_error = ""
                    tool_output = ""
                    success = False
                    used_attempt = 0
                    for attempt in range(1, max_tool_retries + 1):
                        used_attempt = attempt
                        try:
                            tool_output = await tool_executor(tool_name, tool_args)
                            success = True
                            break
                        except Exception as exc:  # noqa: BLE001
                            last_error = str(exc)

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
                        tool_args=tool_args,
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

                tool_call_count += 1
                continue

            final_text = assistant_content.strip()
            for piece in self._chunk_text(final_text, 32):
                yield LLMStreamEvent(type="delta", text=piece)
            break
