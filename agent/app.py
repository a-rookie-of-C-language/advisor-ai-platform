from __future__ import annotations

import argparse
import logging
import os
import sys
from contextlib import asynccontextmanager
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import FastAPI

from app_cli import run_cli as run_chat_cli
from app_chat_routes import register_chat_routes
from app_graph_routes import register_graph_routes
from app_run_modes import run_all as run_all_mode
from app_run_modes import run_all_async, run_api, run_indexer
from app_workspace_routes import register_workspace_routes
from app_dependencies import (
    build_llm_extractor_from_env,
    build_memory_orchestrator_from_env,
    build_rag_service_from_env,
)
from chat.stream_service import ChatStreamService
from context.memory.pipeline.llm_extractor import OpenAILLMExtractor
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from llm.provider_factory import build_provider_from_env
from RAG.RAG_service import RAG_service
from tools.workspace import WorkspaceManager

if "pytest" not in sys.modules:
    load_dotenv(override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_memory_orchestrator() -> MemoryOrchestrator | None:
    return build_memory_orchestrator_from_env()


@lru_cache(maxsize=1)
def _get_llm_extractor() -> OpenAILLMExtractor | None:
    return build_llm_extractor_from_env()


@lru_cache(maxsize=1)
def _get_rag_service() -> RAG_service | None:
    return build_rag_service_from_env()


@lru_cache(maxsize=1)
def _get_chat_stream_service() -> ChatStreamService:
    provider = build_provider_from_env()
    return ChatStreamService(
        provider=provider,
        memory_orchestrator=_get_memory_orchestrator(),
        llm_extractor=_get_llm_extractor(),
        rag_service=_get_rag_service(),
    )


@asynccontextmanager
async def _app_lifespan(_: FastAPI):
    try:
        yield
    finally:
        rag = _get_rag_service()
        if rag:
            logger.info("Closing RAG service...")
            rag.close()


def create_api_app() -> FastAPI:
    app = FastAPI(title="advisor-ai-agent", version="1.0.0", lifespan=_app_lifespan)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    register_workspace_routes(app, WorkspaceManager)
    register_chat_routes(app, _get_chat_stream_service)
    register_graph_routes(app, _get_chat_stream_service)

    return app


app = create_api_app()


def run_cli() -> None:
    run_chat_cli(_get_chat_stream_service)


async def _run_all_async() -> None:
    await run_all_async(app)


def run_all() -> None:
    run_all_mode(app)


def main() -> None:
    parser = argparse.ArgumentParser(description="Advisor AI Agent")
    parser.add_argument(
        "--mode",
        choices=["all", "indexer", "api", "cli"],
        default=os.getenv("AGENT_MODE", "all"),
        help="Run mode: all or indexer or api or cli",
    )
    args = parser.parse_args()

    if args.mode == "api":
        run_api()
        return

    if args.mode == "indexer":
        run_indexer()
        return

    if args.mode == "cli":
        run_cli()
        return

    run_all()


if __name__ == "__main__":
    main()
