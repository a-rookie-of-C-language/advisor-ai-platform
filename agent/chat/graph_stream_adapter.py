from __future__ import annotations

from json_types import JsonObject

GRAPH_EVENT_NAME_MAP = {
    "delta": "llm_data",
    "sources": "tool_result",
    "error": "sys_error",
    "done": "sys_done",
    "start": "sys_start",
    "intent_route": "sys_intent_route",
}


def normalize_graph_event_name(raw_event_name: str) -> str:
    return GRAPH_EVENT_NAME_MAP.get(raw_event_name, raw_event_name)


def graph_event_has_content(event_name: str) -> bool:
    return event_name not in {"sys_start", "sys_done", "sys_error"}


def graph_text_payload(event_name: str, event_data: object) -> str:
    if event_name not in {"llm_data", "llm_delta", "raw"}:
        return ""
    if not isinstance(event_data, dict):
        return ""
    return str(event_data.get("text", "") or event_data.get("raw", ""))


def graph_output_event_name(
    event_name: str,
    *,
    user_id: int | None,
    session_id: int | None,
) -> str:
    if event_name == "llm_delta" and (user_id is None or session_id is None):
        return "llm_delta"
    return "llm_data"


def graph_event_source(event_name: str) -> str:
    if event_name in {"llm_data", "llm_delta"}:
        return "llm"
    if event_name.startswith("tool_"):
        return "tool"
    return "system"


def graph_event_payload(event_data: object) -> JsonObject:
    return event_data if isinstance(event_data, dict) else {}
