from __future__ import annotations

import argparse
import asyncio
import json
import time
from collections.abc import AsyncIterator
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from starlette.responses import StreamingResponse


def _serialize_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _resolve_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return request.headers.get("X-Agent-Token", "").strip()


async def _stream_response(payload: dict[str, Any], latency_ms: int) -> AsyncIterator[str]:
    messages = payload.get("messages", [])
    question = ""
    if messages and isinstance(messages[-1], dict):
        question = str(messages[-1].get("content", ""))

    yield _serialize_sse("start", {"message": "stream_started"})
    await asyncio.sleep(max(latency_ms, 0) / 1000)
    yield _serialize_sse("sources", {"tool": "rag_search", "success": True, "status": "hit", "items": []})
    yield _serialize_sse(
        "delta",
        {
            "text": (
                "根据辅导员素质能力提升文件汇编，已命中mock知识库。"
                f"问题：{question}。建议结合文件条款进行回答。"
            )
        },
    )
    yield _serialize_sse("done", {"message": "stream_finished"})


def create_app(token: str, latency_ms: int) -> FastAPI:
    app = FastAPI(title="agent-jmeter-mock", version="1.0.0")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/graph/health")
    async def graph_health() -> dict[str, Any]:
        return {
            "status": "ok",
            "graph_health": {
                "use_langgraph": True,
                "registered_tools": ["rag_search"],
                "graph": {"compiled": True},
            },
        }

    @app.post("/chat/stream")
    async def chat_stream(request: Request) -> StreamingResponse:
        if token and _resolve_token(request) != token:
            raise HTTPException(status_code=401, detail="invalid agent token")

        payload = await request.json()
        return StreamingResponse(
            _stream_response(payload, latency_ms),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Mock Agent API for JMeter pressure tests")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=18001)
    parser.add_argument("--token", default="arookieofc")
    parser.add_argument("--latency-ms", type=int, default=25)
    args = parser.parse_args()

    app = create_app(token=args.token, latency_ms=args.latency_ms)
    started_at = int(time.time())
    print(f"agent jmeter mock server started_at={started_at} http://{args.host}:{args.port}", flush=True)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
