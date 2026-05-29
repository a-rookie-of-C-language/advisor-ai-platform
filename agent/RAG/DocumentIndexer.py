import asyncio
import logging
from typing import Optional

import asyncpg

from RAG.annotator.annotation_pipeline import AnnotationPipeline
from RAG.chunk_engine.registry import ChunkEngineRegistry
from RAG.document_indexing_flow import DocumentIndexingFlow
from RAG.DocumentIndexerStorage import DocumentIndexerStorage
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
        self._storage = DocumentIndexerStorage(
            db_dsn=db_dsn,
            db_pool_minconn=db_pool_minconn,
            db_pool_maxconn=db_pool_maxconn,
            db_statement_timeout_sec=db_statement_timeout_sec,
            max_retries=max_retries,
            retry_backoff_sec=retry_backoff_sec,
        )
        self._indexing_flow = DocumentIndexingFlow(
            storage=self._storage,
            chunk_registry=self._chunk_registry,
            embedding_engine=self._embedding_engine,
            annotation_pipeline=self._annotation_pipeline,
        )
        self._retry_backoff_sec = retry_backoff_sec

        self._listen_conn: Optional[asyncpg.Connection] = None

        self._processing_docs: set[int] = set()
        self._processing_lock = asyncio.Lock()

    async def listen(self) -> None:
        """持续监听通知。连接中断后自动重连。"""
        await self._storage.init_pool()

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
                except Exception as exc:  # noqa: BLE001 — 监听中断需要重连而非崩溃
                    logger.exception("监听中断，%.1f 秒后重连: %s", self._retry_backoff_sec, exc)
                    await asyncio.sleep(self._retry_backoff_sec)
                finally:
                    await self._cleanup_listener_conn(conn)
        finally:
            await self._storage.close_pool()

    async def close(self) -> None:
        await self._cleanup_listener_conn(self._listen_conn)
        await self._storage.close_pool()

    def _on_notify(self, _connection, _pid, _channel, payload) -> None:
        try:
            document_id = int(payload)
        except (ValueError, TypeError):
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
        await self._indexing_flow.process_document(document_id)

    async def _cleanup_listener_conn(self, conn: Optional[asyncpg.Connection]) -> None:
        if conn is None:
            return
        try:
            await conn.remove_listener("rag_index", self._on_notify)
        except Exception:  # noqa: BLE001 — 清理操作不应阻断后续关闭
            pass
        try:
            await conn.close()
        except Exception:  # noqa: BLE001 — 清理操作不应阻断后续关闭
            pass
        if self._listen_conn is conn:
            self._listen_conn = None
