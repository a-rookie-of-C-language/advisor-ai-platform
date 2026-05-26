from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from agents.base.ToolCallResult import ToolCallResult
from json_types import JsonObject, JsonValue
from llm.base_provider import BaseLLMProvider
from llm.chat_message import ChatMessage


async def call_llm_text(
    llm_provider: BaseLLMProvider,
    messages: list[dict[str, str]],
    **kwargs: Any,
) -> str:
    chat_messages = [ChatMessage(role=message["role"], content=message["content"]) for message in messages]
    chunks: list[str] = []
    async for chunk in llm_provider.stream_chat(chat_messages, **kwargs):
        chunks.append(chunk)
    return "".join(chunks)


async def call_llm_json_response(
    call_llm: Callable[..., Awaitable[str]],
    messages: list[dict[str, str]],
    *,
    agent_name: str,
    logger: logging.Logger,
    max_retries: int = 2,
    **kwargs: Any,
) -> JsonObject:
    kwargs.setdefault("response_format", {"type": "json_object"})
    last_error = ""
    chat_messages = list(messages)

    for attempt in range(max_retries + 1):
        raw = await call_llm(chat_messages, **kwargs)
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
            last_error = f"期望 JSON 对象，实际类型: {type(data).__name__}"
        except json.JSONDecodeError as exc:
            last_error = f"JSON 解析失败: {exc}"

        logger.warning(
            "agent_call_llm_json: 解析失败 attempt=%d/%d, name=%s, error=%s",
            attempt + 1,
            max_retries + 1,
            agent_name,
            last_error,
        )

        if attempt < max_retries:
            chat_messages = list(messages) + [
                {"role": "user", "content": f"上次输出格式错误：{last_error}，请严格返回 JSON 格式。"},
            ]

    raise RuntimeError(f"LLM JSON 解析失败，已重试 {max_retries} 次: {last_error}")


async def call_registered_tool(
    tools: dict[str, Callable[..., Awaitable[JsonValue]]],
    *,
    agent_name: str,
    tool_name: str,
    logger: logging.Logger,
    **kwargs: Any,
) -> ToolCallResult:
    tool = tools.get(tool_name)
    if tool is None:
        return ToolCallResult(tool_name=tool_name, success=False, result="", error="tool_not_found")
    try:
        result = await tool(**kwargs)
        return ToolCallResult(tool_name=tool_name, success=True, result=str(result))
    except Exception as exc:
        logger.warning("agent_tool_call_failed name=%s tool=%s err=%s", agent_name, tool_name, exc)
        return ToolCallResult(tool_name=tool_name, success=False, result="", error=str(exc))
