from __future__ import annotations

import logging
import threading
import time
from typing import Any, Dict, List, Optional, Set

import psycopg2
from psycopg2.pool import ThreadedConnectionPool

logger = logging.getLogger(__name__)


class PgVectorDAO:
    """基于 pgvector 的向量检索 DAO。"""

    def __init__(
        self,
        db_dsn: str,
        minconn: int = 1,
        maxconn: int = 5,
        statement_timeout_sec: int = 10,
        max_retries: int = 2,
        retry_backoff_sec: float = 0.2,
    ) -> None:
        self._db_dsn = db_dsn
        self._statement_timeout_ms = statement_timeout_sec * 1000
        self._max_retries = max_retries
        self._retry_backoff_sec = retry_backoff_sec
        self._lock = threading.Lock()
        self._pool: Optional[ThreadedConnectionPool] = ThreadedConnectionPool(
            minconn=minconn,
            maxconn=maxconn,
            dsn=db_dsn,
        )

    def search(
        self,
        query_vector: List[float],
        kb_id: int,
        top_k: int,
        doc_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """执行 pgvector 检索，返回 Chroma 兼容格式。"""
        vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

        sql = """
            SELECT
                rdc.id          AS chunk_id,
                rdc.document_id,
                rdc.content,
                rdc.chunk_index,
                rd.file_name,
                rd.file_type,
                rdc.metadata,
                rdc.embedding <=> %s::vector AS distance
            FROM rag_document_chunk rdc
            JOIN rag_document rd ON rdc.document_id = rd.id
            WHERE rd.knowledge_base_id = %s
              AND rd.status = 'READY'
        """
        params: list = [vector_str, kb_id]

        if doc_ids:
            placeholders = ",".join(["%s"] * len(doc_ids))
            sql += f" AND rdc.document_id IN ({placeholders})"
            params.extend(doc_ids)

        sql += " ORDER BY distance ASC LIMIT %s"
        params.append(top_k)

        rows = self._run_with_retry("search", self._query_rows, sql, params)

        ids, docs, metadatas, distances = [], [], [], []
        for row in rows:
            chunk_id, doc_id, content, chunk_index, file_name, file_type, chunk_metadata, distance = row
            ids.append(str(chunk_id))
            docs.append(content)
            distances.append(float(distance))

            meta: Dict[str, Any] = {
                "document_id": str(doc_id),
                "source": file_name,
                "source_type": file_type,
                "doc_title": file_name,
                "chunk_index": chunk_index,
            }
            if chunk_metadata and isinstance(chunk_metadata, dict):
                meta.update(chunk_metadata)
            metadatas.append(meta)

        return {
            "ids": [ids],
            "documents": [docs],
            "metadatas": [metadatas],
            "distances": [distances],
        }

    def get_doc_title_map(self, doc_ids: List[int]) -> Dict[int, str]:
        """返回 {doc_id: file_name} 映射。"""
        if not doc_ids:
            return {}

        placeholders = ",".join(["%s"] * len(doc_ids))
        rows = self._run_with_retry(
            "get_doc_title_map",
            self._query_rows,
            f"SELECT id, file_name FROM rag_document WHERE id IN ({placeholders})",
            doc_ids,
        )
        return {row[0]: row[1] for row in rows}

    def get_doc_category_and_title_map(
        self, doc_ids: List[int]
    ) -> tuple[Dict[int, Set[int]], Dict[int, str]]:
        """项目无文档分类，category map 固定返回空。"""
        return {}, self.get_doc_title_map(doc_ids)

    def close(self) -> None:
        with self._lock:
            if self._pool is not None:
                self._pool.closeall()
                self._pool = None

    def _query_rows(self, sql: str, params: list):
        if self._pool is None:
            raise RuntimeError("数据库连接池未初始化")

        conn = self._pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("SET LOCAL statement_timeout = %s", (self._statement_timeout_ms,))
                cur.execute(sql, params)
                return cur.fetchall()
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise
        finally:
            with self._lock:
                self._pool.putconn(conn)

    def _run_with_retry(self, op_name: str, fn, *args):
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
                    "DAO 操作重试，op=%s, attempt=%s/%s, wait=%.1fs, error=%s",
                    op_name,
                    attempt + 1,
                    self._max_retries + 1,
                    wait_sec,
                    exc,
                )
                time.sleep(wait_sec)

        if last_exc:
            raise last_exc
        raise RuntimeError(f"DAO 操作失败: {op_name}")
