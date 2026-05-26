from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Awaitable, Callable, Iterable

from openai import AsyncOpenAI

from json_types import JsonObject
from llm.base_provider import BaseLLMProvider, ToolExecutor
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.message_payload_builder import build_message_payload
from llm.openai_plain_stream import stream_plain_chat
from llm.openai_request_kwargs import build_stream_chat_kwargs
from llm.openai_tool_chat_streamer import OpenAIToolChatStreamer
from llm.thinking_config import ThinkingConfig
from llm.tool_spec import ToolSpec
from prompt.PromptBuilder import PromptBuilder
from workspace.file_handler import (
    extract_text,
    get_mime_type,
    is_image,
    read_image_base64,
)

logger = logging.getLogger(__name__)


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

    @staticmethod
    def _build_message_payload(message: ChatMessage) -> dict[str, Any]:
        return build_message_payload(
            message,
            extract_text=extract_text,
            read_image_base64=read_image_base64,
            get_mime_type=get_mime_type,
            is_image=is_image,
            logger=logger,
        )

    async def stream_chat(
        self,
        messages: Iterable[ChatMessage],
        *,
        response_format: JsonObject | None = None,
        on_reasoning: Callable[[str], Awaitable[None]] | None = None,
    ) -> AsyncIterator[str]:
        payload = [self._build_message_payload(message) for message in messages]

        kwargs = build_stream_chat_kwargs(
            model=self._model,
            messages=payload,
            temperature=self._temperature,
            response_format=response_format,
            thinking_config=self._thinking_config,
        )

        async for chunk in stream_plain_chat(
            self._client.chat.completions.create,
            kwargs=kwargs,
            payload=payload,
            model=self._model,
            max_retries=self._max_retries,
            stream_timeout_sec=self._stream_timeout_sec,
            stream_idle_timeout_sec=self._stream_idle_timeout_sec,
            on_reasoning=on_reasoning,
            logger=logger,
        ):
            yield chunk

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

        streamer = OpenAIToolChatStreamer(
            client=self._client,
            model=self._model,
            temperature=self._temperature,
            max_retries=self._max_retries,
            tool_round_timeout_sec=self._tool_round_timeout_sec,
            build_message_payload=self._build_message_payload,
            to_tool_payload=lambda current_tools: self._to_tool_payload(
                current_tools,
                strict=strict_tools,
            ),
            chunk_text=self._chunk_text,
            logger=logger,
        )
        async for event in streamer.stream(
            messages,
            tools,
            tool_executor,
            max_tool_calls=max_tool_calls,
            max_tool_retries=max_tool_retries,
            on_tool_result=on_tool_result,
        ):
            yield event
