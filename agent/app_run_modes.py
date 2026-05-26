from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from app_dependencies import build_indexer_from_env, read_int_env

logger = logging.getLogger(__name__)


def require_agent_api_token_for_server_mode(mode: str) -> str:
    token = os.getenv("AGENT_API_TOKEN", "").strip()
    if token:
        return token
    raise RuntimeError(f"AGENT_API_TOKEN is required when running in {mode} mode")


def run_indexer() -> None:
    indexer = build_indexer_from_env()
    try:
        asyncio.run(indexer.listen())
    except KeyboardInterrupt:
        logger.info("Indexer stopped by keyboard interrupt")


def run_api() -> None:
    import uvicorn

    require_agent_api_token_for_server_mode("api")
    host = os.getenv("AGENT_API_HOST", "0.0.0.0")
    port = read_int_env("AGENT_API_PORT", 8001)
    logger.info("Agent API started at http://%s:%s", host, port)
    uvicorn.run("app:app", host=host, port=port, reload=False)


async def run_all_async(api_app: Any) -> None:
    import uvicorn

    require_agent_api_token_for_server_mode("all")
    host = os.getenv("AGENT_API_HOST", "0.0.0.0")
    port = read_int_env("AGENT_API_PORT", 8001)
    logger.info("Agent all-mode started. API at http://%s:%s", host, port)

    indexer = build_indexer_from_env()
    config = uvicorn.Config(api_app, host=host, port=port, reload=False)
    server = uvicorn.Server(config)

    api_task = asyncio.create_task(server.serve(), name="api-server")
    indexer_task = asyncio.create_task(indexer.listen(), name="indexer-listener")

    try:
        while True:
            if api_task.done():
                exc = api_task.exception()
                if exc:
                    raise exc
                break

            if indexer_task.done():
                exc = indexer_task.exception()
                if exc:
                    raise exc
                logger.warning("Indexer exited unexpectedly, stopping API server")
                server.should_exit = True
                await api_task
                break

            await asyncio.sleep(0.5)
    finally:
        if not api_task.done():
            server.should_exit = True
            await api_task

        if not indexer_task.done():
            indexer_task.cancel()
            try:
                await indexer_task
            except asyncio.CancelledError:
                pass

        await indexer.close()


def run_all(api_app: Any) -> None:
    try:
        asyncio.run(run_all_async(api_app))
    except KeyboardInterrupt:
        logger.info("All-mode stopped by keyboard interrupt")
