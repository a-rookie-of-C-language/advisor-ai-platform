from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Set

import psycopg2

logger = logging.getLogger(__name__)


class PgVectorDAO:
    """基于 pgvector 的向量检索 DAO，替代 Chroma 的 RAG_DAO。

    search() 返回与 Chroma 兼容的字典格式，使 RAG_service 无需大改。
    """

    def __init__(self, db_dsn: str) -> None:
        self._db_dsn = db_dsn

    # ── 向量检索 ──

    def search(
        self,
        query_vector: List[float],
        kb_id: int,
        top_k: int,
        doc_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """执行 pgvector 余弦距离检索，返回 Chroma 兼容格式。"""
        vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

        sql = """
            SELECT
                rdc.id          AS chunk_id,
                rdc.document_id,
                rdc.content,
                rdc.chunk_index,
                rd.file_name,
                rd.file_type,
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

        ids, docs, metadatas, distances = [], [], [], []

        conn = psycopg2.connect(self._db_dsn)
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                for row in cur.fetchall():
                    chunk_id, doc_id, content, chunk_index, file_name, file_type, distance = row
                    ids.append(str(chunk_id))
                    docs.append(content)
                    distances.append(float(distance))
                    metadatas.append({
                        "document_id": str(doc_id),
                        "source": file_name,
                        "source_type": file_type,
                        "doc_title": file_name,
                        "chunk_index": chunk_index,
                    })
        finally:
            conn.close()

        return {
            "ids": [ids],
            "documents": [docs],
            "metadatas": [metadatas],
            "distances": [distances],
        }

    # ── 元数据查询 ──

    def get_doc_title_map(self, doc_ids: List[int]) -> Dict[int, str]:
        """返回 {doc_id: file_name} 映射。"""
        if not doc_ids:
            return {}
        conn = psycopg2.connect(self._db_dsn)
        try:
            with conn.cursor() as cur:
                placeholders = ",".join(["%s"] * len(doc_ids))
                cur.execute(
                    f"SELECT id, file_name FROM rag_document WHERE id IN ({placeholders})",
                    doc_ids,
                )
                return {row[0]: row[1] for row in cur.fetchall()}
        finally:
            conn.close()

    def get_doc_category_and_title_map(
        self, doc_ids: List[int]
    ) -> tuple[Dict[int, Set[int]], Dict[int, str]]:
        """本项目无文档分类，category map 始终为空，title map 正常返回。"""
        return {}, self.get_doc_title_map(doc_ids)

    def close(self) -> None:
        pass  # 每次操作独立连接，无需全局关闭
