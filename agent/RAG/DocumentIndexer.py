import asyncio
import asyncpg
import psycopg2
import logging
from pathlib import Path

from RAG.chunk_engine.registry import ChunkEngineRegistry
from RAG.embedding_engine.bge_embedding_engine import BgeEmbeddingEngine

logger = logging.getLogger(__name__)


class DocumentIndexer:
    """
    监听 PostgreSQL NOTIFY rag_index 事件，收到文档 ID 后完成:
    1. 读取文件路径与类型（DB查询）
    2. 文档加载 + 切块（ChunkEngine）
    3. 向量化（EmbeddingEngine）
    4. 写入 rag_document_chunk
    5. 更新 rag_document.status
    """

    def __init__(self, db_dsn: str, ollama_base_url: str = "http://localhost:11434"):
        self.db_dsn = db_dsn
        self._chunk_registry = ChunkEngineRegistry()
        self._embedding_engine = BgeEmbeddingEngine()

    # ── 主循环 ──

    async def listen(self):
        """建立 asyncpg 连接并持续监听 rag_index 通知"""
        logger.info("连接数据库，监听 rag_index 通知...")
        conn = await asyncpg.connect(self.db_dsn)
        await conn.add_listener("rag_index", self._on_notify)
        logger.info("已开始监听，等待文档上传...")
        try:
            while True:
                await asyncio.sleep(1)
        finally:
            await conn.remove_listener("rag_index", self._on_notify)
            await conn.close()

    def _on_notify(self, connection, pid, channel, payload):
        """收到通知时的回调（asyncpg 回调是同步的，需要创建异步任务）"""
        document_id = int(payload)
        logger.info(f"收到索引通知，document_id={document_id}")
        asyncio.create_task(self._process_document(document_id))

    # ── 文档处理 ──

    async def _process_document(self, document_id: int):
        try:
            await self._set_status(document_id, "INDEXING")
            file_path, file_type = await self._get_document_info(document_id)

            if not file_path:
                logger.error(f"document_id={document_id} file_path 为空")
                await self._set_status(document_id, "FAILED")
                return

            if not Path(file_path).exists():
                logger.error(f"文件不存在: {file_path}")
                await self._set_status(document_id, "FAILED")
                return

            # 使用 ChunkEngineRegistry 自动选择引擎切块
            engine, _ = self._chunk_registry.select(Path(file_path), None)
            texts = engine.chunk(Path(file_path))
            if not texts:
                logger.warning(f"document_id={document_id} 切块结果为空")
                await self._set_status(document_id, "FAILED")
                return

            # 向量化（BgeEmbeddingEngine 返回 List[List[float]]）
            vectors = self._embedding_engine.embed_texts(texts)

            # 写入 DB
            await self._save_chunks(document_id, texts, vectors)
            await self._set_status(document_id, "READY")
            logger.info(f"document_id={document_id} 索引完成，共 {len(texts)} 个分块")

        except Exception as e:
            logger.exception(f"document_id={document_id} 索引失败: {e}")
            await self._set_status(document_id, "FAILED")

    # ── 数据库操作（同步 psycopg2，在线程池中执行）──

    async def _get_document_info(self, document_id: int):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_get_document_info, document_id)

    def _sync_get_document_info(self, document_id: int):
        conn = psycopg2.connect(self.db_dsn)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT file_path, file_type FROM rag_document WHERE id = %s",
                    (document_id,)
                )
                row = cur.fetchone()
                return (row[0], row[1]) if row else (None, None)
        finally:
            conn.close()

    async def _save_chunks(self, document_id: int, texts: list, vectors: list):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._sync_save_chunks, document_id, texts, vectors)

    def _sync_save_chunks(self, document_id: int, texts: list, vectors: list):
        conn = psycopg2.connect(self.db_dsn)
        try:
            with conn.cursor() as cur:
                # 清理旧 chunk（支持重新索引）
                cur.execute("DELETE FROM rag_document_chunk WHERE document_id = %s", (document_id,))
                for idx, (text, vector) in enumerate(zip(texts, vectors)):
                    cur.execute(
                        """
                        INSERT INTO rag_document_chunk (document_id, chunk_index, content, embedding)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (document_id, idx, text, str(vector))
                    )
            conn.commit()
        finally:
            conn.close()

    async def _set_status(self, document_id: int, status: str):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._sync_set_status, document_id, status)

    def _sync_set_status(self, document_id: int, status: str):
        conn = psycopg2.connect(self.db_dsn)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE rag_document SET status = %s, updated_at = NOW() WHERE id = %s",
                    (status, document_id)
                )
            conn.commit()
        finally:
            conn.close()

