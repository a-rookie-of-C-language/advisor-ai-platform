from __future__ import annotations

import logging
import os

from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.pipeline.llm_extractor import OpenAILLMExtractor
from context.memory.pipeline.orchestrator import MemoryOrchestrator
from RAG.DocumentIndexer import DocumentIndexer
from RAG.RAG_service import RAG_service

logger = logging.getLogger(__name__)


def read_int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %s", name, default)
        return default


def read_float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %.1f", name, default)
        return default


def build_memory_orchestrator_from_env() -> MemoryOrchestrator | None:
    memory_api_base_url = os.getenv("MEMORY_API_BASE_URL", "").strip()
    if not memory_api_base_url:
        return None

    token = os.getenv("MEMORY_API_TOKEN", "").strip()
    if not token:
        logger.error("MEMORY_API_TOKEN is required when MEMORY_API_BASE_URL is configured.")
        raise RuntimeError("Missing MEMORY_API_TOKEN for memory API access")

    api_client = MemoryApiClient(
        base_url=memory_api_base_url,
        timeout_sec=read_float_env("MEMORY_API_TIMEOUT_SEC", 30.0),
        max_retries=read_int_env("MEMORY_API_MAX_RETRIES", 2),
        retry_backoff_sec=read_float_env("MEMORY_API_RETRY_BACKOFF_SEC", 0.3),
        bearer_token=token,
    )
    return MemoryOrchestrator(api_client=api_client)


def build_llm_extractor_from_env() -> OpenAILLMExtractor | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "").strip()
    base_url = os.getenv("OPENAI_BASE_URL", "").strip()

    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY for llm extractor")
    if not model:
        raise RuntimeError("Missing OPENAI_MODEL for llm extractor")
    if not base_url:
        raise RuntimeError("Missing OPENAI_BASE_URL for llm extractor")
    return OpenAILLMExtractor(api_key=api_key, model=model, base_url=base_url)


def build_rag_service_from_env() -> RAG_service | None:
    db_dsn = os.getenv("DATABASE_URL", "").strip()
    if not db_dsn:
        logger.warning("DATABASE_URL is not set, RAG service will be disabled.")
        return None

    embedding_openai_base_url = os.getenv("EMBEDDING_OPENAI_BASE_URL", "").strip() or os.getenv(
        "OPENAI_BASE_URL", ""
    ).strip()
    embedding_openai_api_key = os.getenv("EMBEDDING_OPENAI_API_KEY", "").strip() or os.getenv(
        "OPENAI_API_KEY", ""
    ).strip()

    try:
        return RAG_service(
            db_dsn=db_dsn,
            ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip(),
            embedding_provider=os.getenv("EMBEDDING_PROVIDER", "ollama").strip().lower(),
            embedding_model=os.getenv("EMBEDDING_MODEL", "bge-m3").strip(),
            embedding_openai_base_url=embedding_openai_base_url or None,
            embedding_openai_api_key=embedding_openai_api_key or None,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to initialize RAG service: %s", exc)
        return None


def build_indexer_from_env() -> DocumentIndexer:
    db_dsn = os.getenv("DATABASE_URL")
    if not db_dsn:
        raise RuntimeError("Missing DATABASE_URL")

    db_pool_minconn = read_int_env("DB_POOL_MINCONN", 1)
    db_pool_maxconn = read_int_env("DB_POOL_MAXCONN", 5)
    db_statement_timeout_sec = read_int_env("DB_STATEMENT_TIMEOUT_SEC", 10)
    max_retries = read_int_env("INDEX_DB_MAX_RETRIES", 2)

    logger.info(
        "Agent indexer started. pool=%s-%s, timeout=%ss, retries=%s",
        db_pool_minconn,
        db_pool_maxconn,
        db_statement_timeout_sec,
        max_retries,
    )

    return DocumentIndexer(
        db_dsn=db_dsn,
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        db_pool_minconn=db_pool_minconn,
        db_pool_maxconn=db_pool_maxconn,
        db_statement_timeout_sec=db_statement_timeout_sec,
        max_retries=max_retries,
        retry_backoff_sec=read_float_env("INDEX_DB_RETRY_BACKOFF_SEC", 0.5),
    )
