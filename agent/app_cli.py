from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable

from chat.stream_service import ChatStreamService
from json_types import JsonObject
from llm.chat_message import ChatMessage

logger = logging.getLogger(__name__)


def parse_sse_event(raw: str) -> JsonObject:
    event_name = "message"
    data: JsonObject = {}
    for line in raw.strip().split("\n"):
        if line.startswith("event:"):
            event_name = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            payload = line.split(":", 1)[1].strip()
            try:
                parsed = json.loads(payload)
                if isinstance(parsed, dict):
                    data = parsed
            except json.JSONDecodeError:
                data = {}
    return {"event": event_name, "data": data}


async def run_cli_loop(service: ChatStreamService) -> None:
    print("CLI mode started. 输入消息后按 Enter 发送，输入 'exit' 退出，输入 'new' 开始新会话。")
    messages: list[ChatMessage] = []

    while True:
        try:
            raw_input = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            logger.info("CLI stopped by user")
            return

        if not raw_input:
            continue
        if raw_input.lower() == "exit":
            logger.info("CLI exit command received")
            return
        if raw_input.lower() == "new":
            messages.clear()
            print("新会话已创建。")
            continue

        messages.append(ChatMessage(role="user", content=raw_input))
        answer_parts: list[str] = []
        try:
            async for event in service.stream_events(messages):
                parsed = parse_sse_event(event)
                event_name = str(parsed.get("event", ""))
                data = parsed.get("data", {})

                if event_name in {"llm_data", "delta"}:
                    text = str(data.get("text", ""))
                    answer_parts.append(text)
                    print(text, end="", flush=True)
                elif event_name in {"sys_done", "done"}:
                    print()
                elif event_name in {"sys_error", "error"}:
                    print(f"\n[error] {data.get('message', '')}")
                elif event_name == "progress":
                    message = data.get("message", "")
                    print(f"\n[{message}]", end="", flush=True)
                elif event_name == "start":
                    continue
                else:
                    print(f"\n[{event_name}] {data}", end="", flush=True)
            answer = "".join(answer_parts).strip()
            if answer:
                messages.append(ChatMessage(role="assistant", content=answer))
        except Exception as exc:  # noqa: BLE001
            print(f"\nCLI error: {exc}")
            logger.exception("CLI stream failed")


def run_cli(service_factory: Callable[[], ChatStreamService]) -> None:
    service = service_factory()
    try:
        asyncio.run(run_cli_loop(service))
    except KeyboardInterrupt:
        logger.info("CLI interrupted by keyboard")
