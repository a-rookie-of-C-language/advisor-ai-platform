from __future__ import annotations

from collections.abc import Callable

from fastapi import FastAPI

from chat.stream_service import ChatStreamService


def register_graph_routes(app: FastAPI, get_chat_stream_service: Callable[[], ChatStreamService]) -> None:
    @app.get("/graph/health")
    async def graph_health() -> dict:
        service = get_chat_stream_service()
        return {
            "status": "ok",
            "graph_health": service.get_graph_health(),
        }
