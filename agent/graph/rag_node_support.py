from __future__ import annotations

from typing import Any

from llm.chat_message import ChatMessage


def build_rag_sources_payload(parsed: dict[str, Any]) -> dict[str, Any]:
    return {
        "tool": "rag_search",
        "success": parsed.get("status") != "error",
        "attempt": 1,
        "status": parsed.get("status", "error"),
        "message": parsed.get("message", "tool execute failed"),
        "items": parsed.get("items", []),
    }


def append_rag_context(
    model_messages: list[ChatMessage],
    parsed: dict[str, Any],
) -> list[ChatMessage]:
    items = parsed.get("items", []) if isinstance(parsed, dict) else []
    if not items:
        return model_messages

    snippets = []
    for item in items[:5]:
        doc_name = item.get("docName") or item.get("doc_name") or "doc"
        snippet = item.get("snippet") or ""
        snippets.append(f"[{doc_name}] {snippet}")
    if not snippets:
        return model_messages

    return model_messages + [
        ChatMessage(
            role="system",
            content=(
                "You have retrieved context from rag_search. "
                "Use it only when relevant and do not fabricate citations.\n" + "\n".join(snippets)
            ),
        )
    ]
