from __future__ import annotations

import argparse
import asyncio
import logging
import os
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

from RAG.DocumentIndexer import DocumentIndexer
from chat.stream_service import ChatStreamService
from llm.base_provider import ChatMessage
from llm.provider_factory import build_provider_from_env
from memory.api.memory_api_client import MemoryApiClient
from memory.pipeline.llm_extractor import OpenAILLMExtractor
from memory.pipeline.orchestrator import MemoryOrchestrator

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


class ChatMessageDTO(BaseModel):
    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class ChatStreamRequestDTO(BaseModel):
    messages: list[ChatMessageDTO] = Field(..., min_length=1)
    userId: int | None = None
    sessionId: int | None = None
    kbId: int | None = None


@lru_cache(maxsize=1)
def _get_memory_orchestrator() -> MemoryOrchestrator | None:
    memory_api_base_url = os.getenv("MEMORY_API_BASE_URL", "").strip()
    if not memory_api_base_url:
        return None

    token = os.getenv("MEMORY_API_TOKEN", "").strip() or None
    api_client = MemoryApiClient(base_url=memory_api_base_url, bearer_token=token)
    return MemoryOrchestrator(api_client=api_client)


@lru_cache(maxsize=1)
def _get_llm_extractor() -> OpenAILLMExtractor | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip() or os.getenv("api_key", "").strip()
    model = os.getenv("OPENAI_MODEL", "").strip() or os.getenv("model_id", "").strip()
    base_url = os.getenv("OPENAI_BASE_URL", "").strip() or os.getenv("base_url", "").strip() or None

    if not api_key or not model:
        return None
    return OpenAILLMExtractor(api_key=api_key, model=model, base_url=base_url)


@lru_cache(maxsize=1)
def _get_chat_stream_service() -> ChatStreamService:
    provider = build_provider_from_env()
    return ChatStreamService(
        provider=provider,
        memory_orchestrator=_get_memory_orchestrator(),
        llm_extractor=_get_llm_extractor(),
    )


def create_api_app() -> FastAPI:
    app = FastAPI(title="advisor-ai-agent", version="1.0.0")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/chat/stream")
    async def chat_stream(request: ChatStreamRequestDTO) -> StreamingResponse:
        service = _get_chat_stream_service()
        messages = [ChatMessage(role=item.role, content=item.content) for item in request.messages]

        return StreamingResponse(
            service.stream_events(
                messages,
                user_id=request.userId,
                session_id=request.sessionId,
                kb_id=request.kbId,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return app


app = create_api_app()


def _read_int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %s", name, default)
        return default


def _read_float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %.1f", name, default)
        return default


def run_indexer() -> None:
    db_dsn = os.getenv("DATABASE_URL")
    if not db_dsn:
        raise RuntimeError("Missing DATABASE_URL")

    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    db_pool_minconn = _read_int_env("DB_POOL_MINCONN", 1)
    db_pool_maxconn = _read_int_env("DB_POOL_MAXCONN", 5)
    db_statement_timeout_sec = _read_int_env("DB_STATEMENT_TIMEOUT_SEC", 10)
    max_retries = _read_int_env("INDEX_DB_MAX_RETRIES", 2)
    retry_backoff_sec = _read_float_env("INDEX_DB_RETRY_BACKOFF_SEC", 0.5)

    indexer = DocumentIndexer(
        db_dsn=db_dsn,
        ollama_base_url=ollama_base_url,
        db_pool_minconn=db_pool_minconn,
        db_pool_maxconn=db_pool_maxconn,
        db_statement_timeout_sec=db_statement_timeout_sec,
        max_retries=max_retries,
        retry_backoff_sec=retry_backoff_sec,
    )

    logger.info(
        "Agent indexer started. pool=%s-%s, timeout=%ss, retries=%s",
        db_pool_minconn,
        db_pool_maxconn,
        db_statement_timeout_sec,
        max_retries,
    )

    try:
        asyncio.run(indexer.listen())
    except KeyboardInterrupt:
        logger.info("Indexer stopped by keyboard interrupt")


def run_api() -> None:
    import uvicorn

    host = os.getenv("AGENT_API_HOST", "0.0.0.0")
    port = _read_int_env("AGENT_API_PORT", 8001)
    logger.info("Agent API started at http://%s:%s", host, port)
    uvicorn.run("app:app", host=host, port=port, reload=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Advisor AI Agent")
    parser.add_argument(
        "--mode",
        choices=["indexer", "api"],
        default=os.getenv("AGENT_MODE", "indexer"),
        help="Run mode: indexer or api",
    )
    args = parser.parse_args()

    if args.mode == "api":
        run_api()
        return

    run_indexer()


if __name__ == "__main__":
    main()
