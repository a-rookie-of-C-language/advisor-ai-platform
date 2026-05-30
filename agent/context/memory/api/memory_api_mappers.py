from __future__ import annotations

from datetime import datetime

from context.memory.core.MemoryItem import MemoryItem
from context.memory.core.SessionSummary import SessionSummary
from json_types import JsonObject, JsonValue


def parse_datetime(value: JsonValue) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def to_memory_item(data: JsonObject) -> MemoryItem:
    supersedes_id = data.get("supersedesId")
    merged_into_id = data.get("mergedIntoId")
    return MemoryItem(
        id=int(data.get("id", 0)),
        user_id=int(data.get("userId", 0)),
        kb_id=int(data.get("kbId", 0)),
        content=str(data.get("content", "")),
        confidence=float(data.get("confidence", 0.5)),
        score=float(data.get("score", 0.0)),
        created_at=parse_datetime(data.get("createdAt")),
        updated_at=parse_datetime(data.get("updatedAt")),
        expires_at=parse_datetime(data.get("expiresAt")),
        tags=data.get("tags") or {},
        memory_type=str(data.get("memoryType", "semantic")),
        valid_until=parse_datetime(data.get("validUntil")),
        supersedes_id=int(supersedes_id) if supersedes_id is not None else None,
        merged_into_id=int(merged_into_id) if merged_into_id is not None else None,
    )


def to_session_summary(data: JsonObject, session_id: int) -> SessionSummary:
    return SessionSummary(
        session_id=int(data.get("sessionId", session_id)),
        summary=str(data.get("summary", "")),
        updated_at=parse_datetime(data.get("updatedAt")),
    )
