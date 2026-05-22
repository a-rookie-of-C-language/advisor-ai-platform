from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

import httpx
from agent.types import JsonObject, JsonValue
from dotenv import load_dotenv

if __package__ and __package__.startswith("agent."):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import _get_rag_service
from chat.stream_service import ChatStreamService
from llm.chat_message import ChatMessage
from llm.provider_factory import build_provider_from_env

logger = logging.getLogger(__name__)


class ChatDebugCli:
    def __init__(self, service: ChatStreamService) -> None:
        self._service = service
        self._messages: list[ChatMessage] = []
        self._backend_base_url = os.getenv("CLI_BACKEND_BASE_URL", "http://localhost:8080").rstrip("/")
        self._username = os.getenv("CLI_AUTH_USERNAME", "admin")
        self._password = os.getenv("CLI_AUTH_PASSWORD", "password")
        self._user_id = 1
        self._access_token = ""
        self._session_id: int | None = None
        self._debug_events = os.getenv("CLI_DEBUG_EVENTS", "false").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

    @staticmethod
    def _parse_sse_event(raw: str) -> JsonObject:
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

    @staticmethod
    def _extract_text(data: JsonValue) -> str:
        if isinstance(data, str):
            return data
        if isinstance(data, dict):
            for key in ("text", "content", "message", "delta", "raw"):
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    return value
                nested = ChatDebugCli._extract_text(value)
                if nested:
                    return nested
            return ""
        if isinstance(data, list):
            parts = [ChatDebugCli._extract_text(item) for item in data]
            return "".join(part for part in parts if part)
        return ""

    @staticmethod
    def _preview_event_data(data: JsonValue, limit: int = 300) -> str:
        raw = json.dumps(data, ensure_ascii=False, default=str)
        if len(raw) <= limit:
            return raw
        return f"{raw[:limit]}...(truncated)"

    async def _login_and_create_session(self) -> None:
        self._access_token = await self._login()
        self._session_id = await self._create_session(self._access_token)

    async def _login(self) -> str:
        url = f"{self._backend_base_url}/api/auth/login"
        payload = {"username": self._username, "password": self._password}
        logger.info("CLI login start: url=%s, username=%s", url, self._username)
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        token = (
            data.get("data", {}).get("accessToken")
            or data.get("data", {}).get("token")
            or ""
        )
        if not isinstance(token, str) or not token.strip():
            logger.error("CLI login failed: token missing, response=%s", data)
            raise RuntimeError("登录成功但未获取到 access token")
        logger.info("CLI login success: token=%s", token.strip())
        return token.strip()

    async def _create_session(self, access_token: str) -> int:
        url = f"{self._backend_base_url}/api/chat/sessions"
        headers = {"Authorization": f"Bearer {access_token}"}
        logger.info("CLI createSession start: url=%s", url)
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, headers=headers, json={})
            response.raise_for_status()
            data = response.json()
        session_id = data.get("data", {}).get("id")
        if isinstance(session_id, bool) or not isinstance(session_id, int):
            logger.error("CLI createSession failed: invalid response=%s", data)
            raise RuntimeError("创建会话成功但响应中缺少有效 sessionId")
        logger.info("CLI createSession success: sessionId=%s", session_id)
        return session_id

    async def run(self) -> None:
        logger.info("CLI bootstrap: file=%s", Path(__file__).resolve())
        try:
            await self._login_and_create_session()
            print(f"已登录 {self._username}，会话已创建：sessionId={self._session_id}")
        except Exception as exc:  # noqa: BLE001
            logger.exception("CLI bootstrap failed")
            print(f"[error] 初始化失败：{exc}")
            return

        print("调试 CLI 已启动，直接输入问题并回车发送。输入 exit/quit 退出，输入 new 新建会话。")
        while True:
            try:
                raw_input = input("> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                return

            if not raw_input:
                continue
            if raw_input.lower() in {"exit", "quit"}:
                return
            if raw_input.lower() == "new":
                self._messages.clear()
                try:
                    self._session_id = await self._create_session(self._access_token)
                    print(f"已新建会话：sessionId={self._session_id}")
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Create session failed")
                    print(f"[error] 新建会话失败：{exc}")
                continue

            self._messages.append(ChatMessage(role="user", content=raw_input))
            answer_parts: list[str] = []
            try:
                async for event in self._service.stream_events(
                    self._messages,
                    user_id=self._user_id,
                    session_id=self._session_id,
                ):
                    parsed = self._parse_sse_event(event)
                    event_name = str(parsed.get("event", ""))
                    data = parsed.get("data", {})
                    if self._debug_events:
                        logger.info(
                            "CLI event: name=%s data=%s",
                            event_name,
                            self._preview_event_data(data),
                        )

                    if event_name in {"delta", "raw", "message"}:
                        text = self._extract_text(data)
                        answer_parts.append(text)
                        print(text, end="", flush=True)
                    elif event_name == "error":
                        print(f"\n[error] {data.get('message', '')}")
                    elif event_name == "done":
                        print()

                answer = "".join(answer_parts).strip()
                if answer:
                    self._messages.append(ChatMessage(role="assistant", content=answer))
            except Exception as exc:  # noqa: BLE001
                logger.exception("CLI stream failed")
                print(f"\n[error] {exc}")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    current_file = Path(__file__).resolve()
    load_dotenv(current_file.parents[1] / ".env", override=True)
    load_dotenv(override=True)
    service = ChatStreamService(
        provider=build_provider_from_env(),
        rag_service=_get_rag_service(),
    )
    cli = ChatDebugCli(service)
    asyncio.run(cli.run())


if __name__ == "__main__":
    main()
