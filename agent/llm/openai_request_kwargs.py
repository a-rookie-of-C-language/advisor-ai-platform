from __future__ import annotations

from json_types import JsonObject
from llm.thinking_config import ThinkingConfig


def build_stream_chat_kwargs(
    *,
    model: str,
    messages: list[JsonObject],
    temperature: float,
    response_format: JsonObject | None,
    thinking_config: ThinkingConfig,
) -> JsonObject:
    kwargs: JsonObject = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }
    if response_format is not None:
        kwargs["response_format"] = response_format
    kwargs.update(thinking_config.to_request_kwargs())
    return kwargs


def build_tool_round_kwargs(
    *,
    model: str,
    messages: list[JsonObject],
    temperature: float,
    tools: list[JsonObject],
    tool_choice: JsonObject | str,
    max_tokens_bumped: bool,
) -> JsonObject:
    kwargs: JsonObject = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
        "tools": tools,
        "tool_choice": tool_choice,
    }
    if max_tokens_bumped:
        kwargs["max_tokens"] = 65536
    return kwargs
