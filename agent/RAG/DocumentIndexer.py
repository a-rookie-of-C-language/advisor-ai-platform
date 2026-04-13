import asyncio
import logging
import time
from pathlib import Path
from typing import Callable, Optional

import asyncpg
import psycopg2
from psycopg2.pool import SimpleConnectionPool

from RAG.chunk_engine.registry import ChunkEngineRegistry
from RAG.embedding_engine.ollama_embedding_engine import OllamaEmbeddingEngine

logger = logging.getLogger(__name__)


class DocumentIndexer:
    """监听 rag_index 通知并构建文档索引。"""

    def __init__(
        self,
        db_dsn: str,
        ollama_base_url: str = "http://localhost:11434",
        db_pool_minconn: int = 1,
        db_pool_maxconn: int = 5,
        db_statement_timeout_sec: int = 10,
        max_retries: int = 2,
        retry_backoff_sec: float = 0.5,
    ):
        self.db_dsn = db_dsn
        self._chunk_registry = ChunkEngineRegistry()
        self._embedding_engine = OllamaEmbeddingEngine(model="bge-m3", base_url=ollama_base_url)

        self._db_pool_minconn = db_pool_minconn
        self._db_pool_maxconn = db_pool_maxconn
        self._db_statement_timeout_ms = db_statement_timeout_sec * 1000
        self._max_retries = max_retries
        self._retry_backoff_sec = retry_backoff_sec

        self._sync_pool: Optional[SimpleConnectionPool] = None
        self._listen_conn: Optional[asyncpg.Connection] = None

        self._processing_docs: set[int] = set()
        self._processing_lock = asyncio.Lock()

    async def listen(self) -> None:
        """持续监听通知。连接中断后自动重连。"""
        self._init_sync_pool()

        try:
            while True:
                conn: Optional[asyncpg.Connection] = None
                try:
                    logger.info("连接数据库并监听 rag_index 通知")
                    conn = await asyncpg.connect(self.db_dsn)
                    self._listen_conn = conn
                    await conn.add_listener("rag_index", self._on_notify)
                    logger.info("监听已启动，等待索引任务")

                    while True:
                        await asyncio.sleep(1)

                except asyncio.CancelledError:
                    logger.info("监听任务已取消，准备退出")
                    raise
                except Exception as exc:
                    logger.exception("监听中断，%.1f 秒后重连: %s", self._retry_backoff_sec, exc)
                    await asyncio.sleep(self._retry_backoff_sec)
                finally:
                    await self._cleanup_listener_conn(conn)
        finally:
            self._close_sync_pool()

    async def close(self) -> None:
        await self._cleanup_listener_conn(self._listen_conn)
        self._close_sync_pool()

    def _on_notify(self, _connection, _pid, _channel, payload) -> None:
        try:
            document_id = int(payload)
        except Exception:
            logger.warning("收到非法通知载荷: %s", payload)
            return

        asyncio.create_task(self._schedule_document(document_id))

    async def _schedule_document(self, document_id: int) -> None:
        async with self._processing_lock:
            if document_id in self._processing_docs:
                logger.info("跳过重复通知，document_id=%s", document_id)
                return
            self._processing_docs.add(document_id)

        logger.info("收到索引通知，document_id=%s", document_id)
        try:
            await self._process_document(document_id)
        finally:
            async with self._processing_lock:
                self._processing_docs.discard(document_id)

    async def _process_document(self, document_id: int) -> None:
        try:
            await self._set_status(document_id, "INDEXING")
            file_path, _file_type = await self._get_document_info(document_id)

            if not file_path:
                logger.error("file_path 为空，document_id=%s", document_id)
                await self._set_status(document_id, "FAILED")
                return

            path = Path(file_path)
            if not path.exists():
                logger.error("文件不存在，document_id=%s, path=%s", document_id, file_path)
                await self._set_status(document_id, "FAILED")
                return

            engine, _ = self._chunk_registry.select(path, None)
            texts = engine.chunk(path)
            if not texts:
                logger.warning("切块结果为空，document_id=%s", document_id)
                await self._set_status(document_id, "FAILED")
                return

            vectors = self._embedding_engine.embed_texts(texts)
            await self._save_chunks(document_id, texts, vectors)
            await self._set_status(document_id, "READY")
            logger.info("索引完成，document_id=%s, chunks=%s", document_id, len(texts))

        except Exception as exc:
            logger.exception("索引失败，document_id=%s, error=%s", document_id, exc)
            await self._set_status(document_id, "FAILED")

    async def _get_document_info(self, document_id: int):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            lambda: self._run_with_retry("get_document_info", self._sync_get_document_info, document_id),
        )

    async def _save_chunks(self, document_id: int, texts: list, vectors: list):
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            lambda: self._run_with_retry("save_chunks", self._sync_save_chunks, document_id, texts, vectors),
        )

    async def _set_status(self, document_id: int, status: str):
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            lambda: self._run_with_retry("set_status", self._sync_set_status, document_id, status),
        )

    def _sync_get_document_info(self, document_id: int):
        conn = self._acquire_conn()
        try:
            with conn.cursor() as cur:
                self._set_statement_timeout(cur)
                cur.execute(
                    "SELECT file_path, file_type FROM rag_document WHERE id = %s",
                    (document_id,),
                )
                row = cur.fetchone()
                return (row[0], row[1]) if row else (None, None)
        finally:
            self._release_conn(conn)

    def _sync_save_chunks(self, document_id: int, texts: list, vectors: list):
        conn = self._acquire_conn()
        try:
            with conn.cursor() as cur:
                self._set_statement_timeout(cur)
                cur.execute("DELETE FROM rag_document_chunk WHERE document_id = %s", (document_id,))
                for idx, (text, vector) in enumerate(zip(texts, vectors)):
                    cur.execute(
                        """
                        INSERT INTO rag_document_chunk (document_id, chunk_index, content, embedding)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (document_id, idx, text, str(vector)),
                    )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release_conn(conn)

    def _sync_set_status(self, document_id: int, status: str):
        conn = self._acquire_conn()
        try:
            with conn.cursor() as cur:
                self._set_statement_timeout(cur)
                cur.execute(
                    "UPDATE rag_document SET status = %s, updated_at = NOW() WHERE id = %s",
                    (status, document_id),
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release_conn(conn)

    def _run_with_retry(self, op_name: str, fn: Callable, *args):
        last_exc = None
        transient_errors = (psycopg2.OperationalError, psycopg2.InterfaceError, psycopg2.errors.QueryCanceled)

        for attempt in range(self._max_retries + 1):
            try:
                return fn(*args)
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
                self._recreate_sync_pool()
                time.sleep(wait_sec)

        if last_exc:
            raise last_exc
        raise RuntimeError(f"数据库操作失败: {op_name}")

    def _init_sync_pool(self) -> None:
        if self._sync_pool is not None:
            return
        self._sync_pool = SimpleConnectionPool(
            minconn=self._db_pool_minconn,
            maxconn=self._db_pool_maxconn,
            dsn=self.db_dsn,
        )
        logger.info("已初始化同步连接池，min=%s, max=%s", self._db_pool_minconn, self._db_pool_maxconn)

    def _close_sync_pool(self) -> None:
        if self._sync_pool is not None:
            self._sync_pool.closeall()
            self._sync_pool = None
            logger.info("同步连接池已关闭")

    def _recreate_sync_pool(self) -> None:
        self._close_sync_pool()
        self._init_sync_pool()

    def _acquire_conn(self):
        if self._sync_pool is None:
            self._init_sync_pool()
        assert self._sync_pool is not None
        return self._sync_pool.getconn()

    def _release_conn(self, conn) -> None:
        if self._sync_pool is not None:
            self._sync_pool.putconn(conn)
        else:
            conn.close()

    def _set_statement_timeout(self, cur) -> None:
        cur.execute("SET LOCAL statement_timeout = %s", (self._db_statement_timeout_ms,))

    async def _cleanup_listener_conn(self, conn: Optional[asyncpg.Connection]) -> None:
        if conn is None:
            return
        try:
            await conn.remove_listener("rag_index", self._on_notify)
        except Exception:
            pass
        try:
            await conn.close()
        except Exception:
            pass
        if self._listen_conn is conn:
            self._listen_conn = None
