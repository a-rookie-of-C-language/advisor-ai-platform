from __future__ import annotations

import json
import logging
import re
from typing import Iterable

from json_types import JsonObject
from llm.chat_message import ChatMessage

logger = logging.getLogger(__name__)

_ALLOWED_ROLES = {"system", "user", "assistant"}
_URL_PATTERN = re.compile(r"https?://[^\s)>\"]+")


def _u(*codes: int) -> str:
    return "".join(chr(code) for code in codes)


_RAG_PRIORITY_HINTS = {
    _u(0x77E5, 0x8BC6, 0x5E93),
    _u(0x8D44, 0x6599),
    _u(0x6587, 0x6863),
    _u(0x6839, 0x636E),
    _u(0x51FA, 0x5904),
    _u(0x8F85, 0x5BFC, 0x5458),
    _u(0x5B66, 0x751F),
}
_REALTIME_HINTS = {
    _u(0x5929, 0x6C14),
    _u(0x5B9E, 0x65F6),
    _u(0x4ECA, 0x5929),
    _u(0x660E, 0x5929),
    _u(0x65B0, 0x95FB),
    _u(0x80A1, 0x4EF7),
    _u(0x6C47, 0x7387),
    _u(0x6BD4, 0x5206),
}


def strip_surrogates(text: str) -> str:
    if not text:
        return text
    return "".join(ch for ch in text if not (0xD800 <= ord(ch) <= 0xDFFF))


def prefer_rag_only(query: str) -> bool:
    normalized = strip_surrogates(query).strip().lower()
    if not normalized:
        return False
    has_rag_hint = any(key in normalized for key in _RAG_PRIORITY_HINTS)
    has_realtime_hint = any(key in normalized for key in _REALTIME_HINTS)
    return has_rag_hint and not has_realtime_hint


def validate_messages(messages: Iterable[ChatMessage]) -> list[ChatMessage]:
    validated = []
    for message in messages:
        role = message.role.strip().lower()
        raw_content = message.content.strip()
        content = strip_surrogates(raw_content).strip()
        if role not in _ALLOWED_ROLES:
            raise ValueError(f"Unsupported role: {message.role}")
        if not content:
            raise ValueError("Message content cannot be empty")
        if content != raw_content:
            logger.warning("Invalid surrogate chars removed from message: role=%s", role)
        validated.append(ChatMessage(role=role, content=content))

    if not validated:
        raise ValueError("messages cannot be empty")
    return validated


def to_memory_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
    return [{"role": item.role, "content": item.content} for item in messages]


def last_user_message(messages: list[ChatMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            return message.content
    return ""


def extract_first_url(text: str) -> str:
    found = _URL_PATTERN.search(text or "")
    return found.group(0) if found else ""


def looks_like_exploration_query(query: str, messages: Iterable[ChatMessage]) -> bool:
    normalized = query.strip().lower()
    if not normalized:
        return False
    direct_hints = (
        "具体",
        "哪些",
        "名单",
        "列表",
        "列出",
        "都有谁",
        "是谁",
        "多少",
        "几个",
        "几名",
        "详情",
        "明细",
    )
    if any(hint in normalized for hint in direct_hints):
        return True
    recent_text = "\n".join((message.content or "") for message in list(messages)[-4:]).lower()
    follow_up_hints = ("他们", "这些", "那些", "这个", "那个", "都有哪些")
    return any(hint in normalized for hint in follow_up_hints) and bool(recent_text)


def has_planned_tool_steps(task_plan: JsonObject) -> bool:
    if not task_plan or not isinstance(task_plan, dict):
        return False
    raw_steps = task_plan.get("steps", [])
    if not isinstance(raw_steps, list):
        return False
    return any(
        isinstance(step, dict) and str(step.get("action", "")).strip().lower() == "call_tool" for step in raw_steps
    )


def build_explorer_context(outcome) -> str:
    payload = {
        "summary": outcome.summary,
        "evidence": outcome.evidence,
        "tool_calls": outcome.tool_calls,
    }
    return (
        "A read-only tool explorer has gathered evidence for the current user question. "
        "Use only this evidence and the visible conversation to answer. "
        "If the evidence is insufficient, say what is missing.\n"
        f"{json.dumps(payload, ensure_ascii=False, default=str)}"
    )


def parse_serialized_event(raw: str) -> JsonObject:
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
    payload = data.get("payload")
    if isinstance(payload, dict):
        data = payload
    return {"event": event_name, "data": data}
