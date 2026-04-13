import asyncio
import logging
import os

from dotenv import load_dotenv

from RAG.DocumentIndexer import DocumentIndexer

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _read_int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("环境变量 %s 不是有效整数，使用默认值 %s", name, default)
        return default


def _read_float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("环境变量 %s 不是有效浮点数，使用默认值 %.1f", name, default)
        return default


def main():
    db_dsn = os.getenv("DATABASE_URL")
    if not db_dsn:
        raise RuntimeError("缺少环境变量 DATABASE_URL")

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
        "Agent 启动，pool=%s-%s, timeout=%ss, retries=%s",
        db_pool_minconn,
        db_pool_maxconn,
        db_statement_timeout_sec,
        max_retries,
    )

    try:
        asyncio.run(indexer.listen())
    except KeyboardInterrupt:
        logger.info("收到中断信号，Agent 即将退出")


if __name__ == "__main__":
    main()
