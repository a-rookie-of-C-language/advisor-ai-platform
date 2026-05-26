from __future__ import annotations

import json
from typing import Any


def dump_tool_error(message: str) -> str:
    return json.dumps(
        {
            "ok": False,
            "status": "error",
            "message": message,
            "items": [],
        }
    )


def dump_web_search_result(result: Any) -> str:
    if not result.safe:
        return json.dumps(
            {
                "ok": False,
                "status": "denied",
                "message": result.filtered_reason or "搜索结果不合规，已过滤",
                "items": [],
            }
        )
    items = [
        {
            "title": src.get("title", ""),
            "snippet": result.summary,
            "url": src.get("url", ""),
            "source": "web",
        }
        for src in result.sources
    ]
    return json.dumps(
        {
            "ok": True,
            "status": "hit" if items else "miss",
            "message": "hit" if items else "no results",
            "items": items,
        }
    )


def dump_web_fetch_result(result: Any) -> str:
    if not result.safe:
        return json.dumps(
            {
                "ok": False,
                "status": "denied",
                "message": result.filtered_reason or "网页内容不合规，已过滤",
                "items": [],
            }
        )
    return json.dumps(
        {
            "ok": True,
            "status": "hit",
            "message": "content extracted",
            "items": [
                {
                    "url": result.url,
                    "content": result.content,
                    "source": result.source,
                }
            ],
        }
    )
