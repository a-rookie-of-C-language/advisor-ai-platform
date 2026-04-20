from __future__ import annotations

import argparse
import asyncio
import inspect
import logging
import os
from contextlib import asynccontextmanager
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

from chat.stream_service import ChatStreamService
from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.pipeline.llm_extractor import OpenAILLMExtractor
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from llm.chat_message import ChatMessage
from llm.provider_factory import build_provider_from_env
from RAG.DocumentIndexer import DocumentIndexer
from RAG.RAG_service import RAG_service

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
    turnId: str | None = None
    traceId: str | None = None


@lru_cache(maxsize=1)
def _get_memory_orchestrator() -> MemoryOrchestrator | None:
    memory_api_base_url = os.getenv("MEMORY_API_BASE_URL", "").strip()
    if not memory_api_base_url:
        return None

    token = os.getenv("MEMORY_API_TOKEN", "").strip()
    if not token:
        logger.error("MEMORY_API_TOKEN is required when MEMORY_API_BASE_URL is configured.")
        raise RuntimeError("Missing MEMORY_API_TOKEN for memory API access")

    timeout_sec = _read_float_env("MEMORY_API_TIMEOUT_SEC", 30.0)
    max_retries = _read_int_env("MEMORY_API_MAX_RETRIES", 2)
    retry_backoff_sec = _read_float_env("MEMORY_API_RETRY_BACKOFF_SEC", 0.3)

    api_client = MemoryApiClient(
        base_url=memory_api_base_url,
        timeout_sec=timeout_sec,
        max_retries=max_retries,
        retry_backoff_sec=retry_backoff_sec,
        bearer_token=token,
    )
    return MemoryOrchestrator(api_client=api_client)


@lru_cache(maxsize=1)
def _get_llm_extractor() -> OpenAILLMExtractor | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "").strip()
    base_url = os.getenv("OPENAI_BASE_URL", "").strip() or None

    if not api_key or not model:
        return None
    return OpenAILLMExtractor(api_key=api_key, model=model, base_url=base_url)


@lru_cache(maxsize=1)
def _get_rag_service() -> RAG_service | None:
    db_dsn = os.getenv("DATABASE_URL", "").strip()
    if not db_dsn:
        logger.warning("DATABASE_URL is not set, RAG service will be disabled.")
        return None

    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()
    embedding_model = os.getenv("EMBEDDING_MODEL", "bge-m3").strip()

    try:
        return RAG_service(
            db_dsn=db_dsn,
            ollama_base_url=ollama_base_url,
            embedding_model=embedding_model,
        )
    except Exception as exc:
        logger.error("Failed to initialize RAG service: %s", exc)
        return None


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


def _require_agent_api_token_for_server_mode(mode: str) -> str:
    token = os.getenv("AGENT_API_TOKEN", "").strip()
    if token:
        return token
    raise RuntimeError(f"AGENT_API_TOKEN is required when running in {mode} mode")


def create_api_app() -> FastAPI:
    app = FastAPI(title="advisor-ai-agent", version="1.0.0", lifespan=_app_lifespan)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/graph/health")
    async def graph_health() -> dict:
        service = _get_chat_stream_service()
        return {
            "status": "ok",
            "graph_health": service.get_graph_health(),
        }

    def _resolve_agent_token(request: Request) -> str:
        auth_header = request.headers.get("Authorization", "").strip()
        if auth_header.lower().startswith("bearer "):
            return auth_header[7:].strip()
        return request.headers.get("X-Agent-Token", "").strip()

    @app.post("/chat/stream")
    async def chat_stream(request: ChatStreamRequestDTO, raw_request: Request) -> StreamingResponse:
        expected_agent_token = os.getenv("AGENT_API_TOKEN", "").strip()
        if expected_agent_token:
            got_token = _resolve_agent_token(raw_request)
            if got_token != expected_agent_token:
                raise HTTPException(status_code=401, detail="invalid agent token")

        service = _get_chat_stream_service()
        messages = [ChatMessage(role=item.role, content=item.content) for item in request.messages]
        trace_id = (
            raw_request.headers.get("X-Trace-Id")
            or request.traceId
            or ""
        )
        turn_id = (
            raw_request.headers.get("X-Turn-Id")
            or request.turnId
            or ""
        )
        logger.info(
            "agent_chat_stream accepted: trace_id=%s, turn_id=%s, session_id=%s, user_id=%s, kb_id=%s, messages=%s",
            trace_id,
            turn_id,
            request.sessionId,
            request.userId,
            request.kbId,
            len(messages),
        )

        stream_kwargs = {
            "user_id": request.userId,
            "session_id": request.sessionId,
            "kb_id": request.kbId,
        }
        # Backward compatible with fake/legacy stream services in tests.
        try:
            parameters = inspect.signature(service.stream_events).parameters
            if "trace_id" in parameters:
                stream_kwargs["trace_id"] = trace_id or None
            if "turn_id" in parameters:
                stream_kwargs["turn_id"] = turn_id or None
        except (TypeError, ValueError):
            pass

        return StreamingResponse(
<<<<<<< HEAD
            service.stream_events(messages, **stream_kwargs),
=======
            service.stream_events(
                messages,
                user_id=request.userId,
                session_id=request.sessionId,
                kb_id=request.kbId,
                trace_id=trace_id or None,
                turn_id=turn_id or None,
            ),
>>>>>>> 1cfd0c3 (chore(flyway): 对齐V11/V12历史并新增V14审计描述迁移)
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


def _build_indexer_from_env() -> DocumentIndexer:
    db_dsn = os.getenv("DATABASE_URL")
    if not db_dsn:
        raise RuntimeError("Missing DATABASE_URL")

    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    db_pool_minconn = _read_int_env("DB_POOL_MINCONN", 1)
    db_pool_maxconn = _read_int_env("DB_POOL_MAXCONN", 5)
    db_statement_timeout_sec = _read_int_env("DB_STATEMENT_TIMEOUT_SEC", 10)
    max_retries = _read_int_env("INDEX_DB_MAX_RETRIES", 2)
    retry_backoff_sec = _read_float_env("INDEX_DB_RETRY_BACKOFF_SEC", 0.5)

    logger.info(
        "Agent indexer started. pool=%s-%s, timeout=%ss, retries=%s",
        db_pool_minconn,
        db_pool_maxconn,
        db_statement_timeout_sec,
        max_retries,
    )

    return DocumentIndexer(
        db_dsn=db_dsn,
        ollama_base_url=ollama_base_url,
        db_pool_minconn=db_pool_minconn,
        db_pool_maxconn=db_pool_maxconn,
        db_statement_timeout_sec=db_statement_timeout_sec,
        max_retries=max_retries,
        retry_backoff_sec=retry_backoff_sec,
    )


def run_indexer() -> None:
    indexer = _build_indexer_from_env()
    try:
        asyncio.run(indexer.listen())
    except KeyboardInterrupt:
        logger.info("Indexer stopped by keyboard interrupt")


def run_api() -> None:
    import uvicorn

    _require_agent_api_token_for_server_mode("api")
    host = os.getenv("AGENT_API_HOST", "0.0.0.0")
    port = _read_int_env("AGENT_API_PORT", 8001)
    logger.info("Agent API started at http://%s:%s", host, port)
    uvicorn.run("app:app", host=host, port=port, reload=False)


async def _run_all_async() -> None:
    import uvicorn

    _require_agent_api_token_for_server_mode("all")
    host = os.getenv("AGENT_API_HOST", "0.0.0.0")
    port = _read_int_env("AGENT_API_PORT", 8001)
    logger.info("Agent all-mode started. API at http://%s:%s", host, port)

    indexer = _build_indexer_from_env()
    config = uvicorn.Config(app, host=host, port=port, reload=False)
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


def run_all() -> None:
    try:
        asyncio.run(_run_all_async())
    except KeyboardInterrupt:
        logger.info("All-mode stopped by keyboard interrupt")


def main() -> None:
    parser = argparse.ArgumentParser(description="Advisor AI Agent")
    parser.add_argument(
        "--mode",
        choices=["all", "indexer", "api"],
        default=os.getenv("AGENT_MODE", "all"),
        help="Run mode: all or indexer or api",
    )
    args = parser.parse_args()

    if args.mode == "api":
        run_api()
        return

    if args.mode == "indexer":
        run_indexer()
        return

    run_all()


if __name__ == "__main__":
    main()
