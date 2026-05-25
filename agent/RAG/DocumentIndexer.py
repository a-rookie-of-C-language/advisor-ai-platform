import asyncio
import json
import logging
from pathlib import Path
from typing import Awaitable, Callable, Optional

import asyncpg

from RAG.annotator.annotation_pipeline import AnnotationPipeline
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
        annotation_pipeline: AnnotationPipeline | None = None,
    ):
        self.db_dsn = db_dsn
        self._chunk_registry = ChunkEngineRegistry()
        self._embedding_engine = OllamaEmbeddingEngine(model="bge-m3", base_url=ollama_base_url)
        self._annotation_pipeline = annotation_pipeline

        self._db_pool_minconn = db_pool_minconn
        self._db_pool_maxconn = db_pool_maxconn
        self._db_statement_timeout_ms = db_statement_timeout_sec * 1000
        self._max_retries = max_retries
        self._retry_backoff_sec = retry_backoff_sec

        self._pool: Optional[asyncpg.Pool] = None
        self._listen_conn: Optional[asyncpg.Connection] = None

        self._processing_docs: set[int] = set()
        self._processing_lock = asyncio.Lock()

    async def listen(self) -> None:
        """持续监听通知。连接中断后自动重连。"""
        await self._init_pool()

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
            await self._close_pool()

    async def close(self) -> None:
        await self._cleanup_listener_conn(self._listen_conn)
        await self._close_pool()

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
            chunk_results = engine.chunk(path)
            if not chunk_results:
                logger.warning("切块结果为空，document_id=%s", document_id)
                await self._set_status(document_id, "FAILED")
                return

            if self._annotation_pipeline is not None:
                chunk_results = self._annotate_chunks(chunk_results, document_id)

            texts = [c.text for c in chunk_results]
            vectors = self._embedding_engine.embed_texts(texts)
            await self._save_chunks(document_id, chunk_results, vectors)
            await self._set_status(document_id, "READY")
            logger.info("索引完成，document_id=%s, chunks=%s", document_id, len(chunk_results))

        except Exception as exc:
            logger.exception("索引失败，document_id=%s, error=%s", document_id, exc)
            await self._set_status(document_id, "FAILED")

    async def _get_document_info(self, document_id: int):
        row = await self._run_with_retry(
            "get_document_info",
            lambda conn: conn.fetchrow(
                "SELECT file_path, file_type FROM rag_document WHERE id = $1",
                document_id,
            ),
        )
        return (row["file_path"], row["file_type"]) if row else (None, None)

    async def _save_chunks(self, document_id: int, chunk_results: list, vectors: list):
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

    async def _set_status(self, document_id: int, status: str):
        await self._run_with_retry(
            "set_status",
            lambda conn: conn.execute(
                "UPDATE rag_document SET status = $1, updated_at = NOW() WHERE id = $2",
                status,
                document_id,
            ),
        )

    def _annotate_chunks(self, chunk_results: list, document_id: int) -> list:
        """对每个切片执行三层标注，将结果合并到 metadata。全部失败则抛出异常拒绝入库。"""
        from RAG.annotator.ChunkAnnotation import ChunkAnnotation

        annotated = []
        failed_count = 0
        for chunk in chunk_results:
            ann: ChunkAnnotation = self._annotation_pipeline.annotate_chunk(chunk.text)
            if ann.confidence <= 0.0:
                failed_count += 1
            chunk.metadata["type"] = ann.type
            chunk.metadata["authority"] = ann.authority
            chunk.metadata["effective_date"] = ann.effective_date
            chunk.metadata["annotation_source"] = ann.source
            chunk.metadata["annotation_confidence"] = ann.confidence
            if ann.extra:
                chunk.metadata.update(ann.extra)
            annotated.append(chunk)

        if failed_count == len(chunk_results):
            logger.warning("所有切片标注失败，document_id=%s", document_id)
            raise ValueError(f"文档质量不足，所有 {len(chunk_results)} 个切片均无法标注元数据")

        logger.info(
            "标注完成，document_id=%s, total=%d, failed=%d",
            document_id,
            len(chunk_results),
            failed_count,
        )
        return annotated

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
            await self._init_pool()
        assert self._pool is not None
        return self._pool

    async def _init_pool(self) -> None:
        if self._pool is not None:
            return
        self._pool = await asyncpg.create_pool(
            dsn=self.db_dsn,
            min_size=self._db_pool_minconn,
            max_size=self._db_pool_maxconn,
        )
        logger.info("已初始化异步连接池，min=%s, max=%s", self._db_pool_minconn, self._db_pool_maxconn)

    async def _close_pool(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            logger.info("异步连接池已关闭")

    async def _recreate_pool(self) -> None:
        await self._close_pool()
        await self._init_pool()

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
