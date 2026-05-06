from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Iterable

from openai import AsyncOpenAI

from llm.base_provider import BaseLLMProvider, ToolExecutor
from llm.chat_message import ChatMessage
from llm.llm_stream_event import LLMStreamEvent
from llm.tool_call_fsm import ToolCallFSM
from llm.tool_spec import ToolSpec
from prompt.QueryEngine import QueryEngine
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
    ) -> None:
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
        )
        self._model = model
        self._temperature = temperature

    def get_client(self) -> AsyncOpenAI:
        return self._client

    @staticmethod
    def _chunk_text(text: str, size: int = 32) -> list[str]:
        if not text:
            return []
        return [text[idx : idx + size] for idx in range(0, len(text), size)]

    @staticmethod
    def _to_tool_payload(tools: list[ToolSpec], *, strict: bool = False) -> list[dict[str, Any]]:
        return QueryEngine.build_tool_payload(tools, strict=strict)

    @staticmethod
    def _build_message_payload(message: ChatMessage) -> dict[str, Any]:
        """构建单条消息的 payload，支持多模态（图片附件）。"""
        if not message.attachments:
            return {"role": message.role, "content": message.content}

        image_parts = []
        doc_texts = []

        for att in message.attachments:
            file_type = att.get("file_type", "")
            file_path = att.get("file_path", "")
            file_name = att.get("file_name", "unknown")

            if not file_path:
                continue

            if is_image(file_type):
                try:
                    b64 = read_image_base64(file_path)
                    mime = get_mime_type(file_type)
                    image_parts.append(
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        }
                    )
                except Exception as e:
                    logger.warning("读取图片失败 %s: %s", file_name, e)
                    doc_texts.append(f"[图片读取失败: {file_name}]")
            else:
                try:
                    text = extract_text(file_path, file_type)
                    doc_texts.append(f"--- {file_name} ---\n{text}")
                except Exception as e:
                    logger.warning("提取文档文本失败 %s: %s", file_name, e)
                    doc_texts.append(f"[文档提取失败: {file_name}]")

        parts: list[dict[str, Any]] = []
        if doc_texts:
            combined_text = message.content + "\n\n" + "\n\n".join(doc_texts)
            parts.append({"type": "text", "text": combined_text})
        else:
            parts.append({"type": "text", "text": message.content})

        parts.extend(image_parts)

        if len(parts) == 1 and parts[0]["type"] == "text":
            return {"role": message.role, "content": parts[0]["text"]}

        return {"role": message.role, "content": parts}

    async def stream_chat(
        self,
        messages: Iterable[ChatMessage],
        *,
        response_format: dict[str, Any] | None = None,
    ) -> AsyncIterator[str]:
        payload = [self._build_message_payload(message) for message in messages]

        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": payload,
            "temperature": self._temperature,
            "stream": True,
        }
        if response_format is not None:
            kwargs["response_format"] = response_format

        stream = await self._client.chat.completions.create(**kwargs)

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
        strict_tools: bool = False,
    ) -> AsyncIterator[LLMStreamEvent]:
        if not tools:
            async for chunk in self.stream_chat(messages):
                yield LLMStreamEvent(type="delta", text=chunk)
            return

        conversation: list[dict[str, Any]] = [
            self._build_message_payload(message) for message in messages
        ]
        tool_payload = self._to_tool_payload(tools, strict=strict_tools)
        tool_call_count = 0

        while True:
            tool_choice: dict[str, Any] | str = "auto"

            response = await self._client.chat.completions.create(
                model=self._model,
                messages=conversation,
                temperature=self._temperature,
                stream=False,
                tools=tool_payload,
                tool_choice=tool_choice,
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
                        call_id=raw_call.id or "",
                        max_args_retries=2,
                        max_exec_retries=max_tool_retries,
                    )

                    # --- 阶段一：参数解析与验证 ---
                    try:
                        tool_args = json.loads(args_text)
                    except Exception:
                        tool_args = None  # type: ignore[assignment]

                    if not fsm.validate_args(tool_args):
                        # FSM 进入 ARGS_RETRY 或 FAILED
                        if fsm.state.value == "args_retry":
                            # 重试：通知 LLM 参数格式错误，等待下一轮修正
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

                        # FAILED：参数解析彻底失败
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

                    # --- 阶段二：工具执行 ---
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
                            tool_output = await tool_executor(
                                tool_name, fsm.context.tool_args, idempotency_key=fsm.idempotency_key
                            )
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

                tool_call_count += 1
                continue

            final_text = assistant_content.strip()
            for piece in self._chunk_text(final_text, 32):
                yield LLMStreamEvent(type="delta", text=piece)
            break
