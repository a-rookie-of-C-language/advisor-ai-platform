import asyncio
import json
import logging
from typing import Awaitable, Callable, Optional

import asyncpg

logger = logging.getLogger(__name__)


class DocumentIndexerStorage:
    def __init__(
        self,
        db_dsn: str,
        db_pool_minconn: int,
        db_pool_maxconn: int,
        db_statement_timeout_sec: int,
        max_retries: int,
        retry_backoff_sec: float,
    ):
        self.db_dsn = db_dsn
        self._db_pool_minconn = db_pool_minconn
        self._db_pool_maxconn = db_pool_maxconn
        self._db_statement_timeout_ms = db_statement_timeout_sec * 1000
        self._max_retries = max_retries
        self._retry_backoff_sec = retry_backoff_sec
        self._pool: Optional[asyncpg.Pool] = None

    async def init_pool(self) -> None:
        if self._pool is not None:
            return
        self._pool = await asyncpg.create_pool(
            dsn=self.db_dsn,
            min_size=self._db_pool_minconn,
            max_size=self._db_pool_maxconn,
        )
        logger.info("已初始化异步连接池，min=%s, max=%s", self._db_pool_minconn, self._db_pool_maxconn)

    async def close_pool(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            logger.info("异步连接池已关闭")

    async def get_document_info(self, document_id: int):
        row = await self._run_with_retry(
            "get_document_info",
            lambda conn: conn.fetchrow(
                "SELECT file_path, file_type FROM rag_document WHERE id = $1",
                document_id,
            ),
        )
        return (row["file_path"], row["file_type"]) if row else (None, None)

    async def save_chunks(self, document_id: int, chunk_results: list, vectors: list):
        async def op(conn: asyncpg.Connection) -> None:
            async with conn.transaction():
                await conn.execute("DELETE FROM rag_document_chunk WHERE document_id = $1", document_id)
                for idx, (chunk, vector) in enumerate(zip(chunk_results, vectors, strict=False)):
                    meta_json = json.dumps(chunk.metadata, ensure_ascii=False) if chunk.metadata else None
                    await conn.execute(
                        """
                        INSERT INTO rag_document_chunk (document_id, chunk_index, content, embedding, metadata)
                        VALUES ($1, $2, $3, $4, $5)
                        """,
                        document_id,
                        idx,
                        chunk.text,
                        str(vector),
                        meta_json,
                    )

        await self._run_with_retry("save_chunks", op)

    async def set_status(self, document_id: int, status: str):
        await self._run_with_retry(
            "set_status",
            lambda conn: conn.execute(
                "UPDATE rag_document SET status = $1, updated_at = NOW() WHERE id = $2",
                status,
                document_id,
            ),
        )

    async def _run_with_retry(self, op_name: str, fn: Callable[[asyncpg.Connection], Awaitable]):
        last_exc = None
        transient_errors = (
            asyncpg.PostgresConnectionError,
            asyncpg.InterfaceError,
            asyncpg.QueryCanceledError,
            TimeoutError,
            OSError,
        )

        for attempt in range(self._max_retries + 1):
            try:
                pool = await self._get_pool()
                async with pool.acquire() as conn:
                    await conn.execute(
                        "SELECT set_config('statement_timeout', $1, false)",
                        f"{self._db_statement_timeout_ms}ms",
                    )
                    return await fn(conn)
            except transient_errors as exc:
                last_exc = exc
                if attempt >= self._max_retries:
                    break
                wait_sec = self._retry_backoff_sec * (attempt + 1)
                logger.warning(
                    "数据库操作重试，op=%s, attempt=%s/%s, wait=%.1fs, error=%s",
                    op_name,
                    attempt + 1,
                    self._max_retries + 1,
                    wait_sec,
                    exc,
                )
                await self._recreate_pool()
                await asyncio.sleep(wait_sec)

        if last_exc:
            raise last_exc
        raise RuntimeError(f"数据库操作失败: {op_name}")

    async def _get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            await self.init_pool()
        assert self._pool is not None
        return self._pool

    async def _recreate_pool(self) -> None:
        await self.close_pool()
        await self.init_pool()
