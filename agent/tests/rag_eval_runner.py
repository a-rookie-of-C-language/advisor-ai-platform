from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]

DEFAULT_QUERIES = [
    "高校辅导员素质能力提升的核心内容是什么",
    "辅导员能力提升包括哪些方面",
    "辅导员素质能力建设有哪些要求",
    "高校辅导员工作能力提升的重点是什么",
    "辅导员培训与能力提升有什么关系",
]


def _load_env() -> None:
    load_dotenv(ROOT / ".env")


def _read_db_dsn() -> str:
    value = os.getenv("DATABASE_URL", "").strip()
    if value:
        return value
    raise RuntimeError("Missing DATABASE_URL in agent/.env")


def _read_ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()


def _read_embedding_model() -> str:
    return os.getenv("EMBEDDING_MODEL", "bge-m3").strip()


def _query_kb_documents(db_dsn: str, kb_id: int) -> list[dict[str, Any]]:
    conn = psycopg2.connect(db_dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    rd.id,
                    rd.knowledge_base_id,
                    rd.status,
                    rd.file_name,
                    rd.file_path,
                    COUNT(rdc.id) AS chunk_count
                FROM rag_document rd
                LEFT JOIN rag_document_chunk rdc ON rdc.document_id = rd.id
                WHERE rd.knowledge_base_id = %s
                GROUP BY rd.id, rd.knowledge_base_id, rd.status, rd.file_name, rd.file_path
                ORDER BY rd.id ASC
                """,
                (kb_id,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "document_id": int(row[0]),
            "knowledge_base_id": int(row[1]),
            "status": str(row[2]),
            "file_name": str(row[3] or ""),
            "file_path": str(row[4] or ""),
            "chunk_count": int(row[5] or 0),
        }
        for row in rows
    ]


def _run_queries(kb_id: int, top_k: int, queries: list[str]) -> dict[str, Any]:
    import sys

    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))

    from RAG.RAG_service import RAG_service
    from RAG.schema import RAGSearchRequest, SearchMode

    rag = RAG_service(
        db_dsn=_read_db_dsn(),
        ollama_base_url=_read_ollama_base_url(),
        embedding_model=_read_embedding_model(),
    )
    try:
        results: list[dict[str, Any]] = []
        hit_count = 0
        total_returned = 0

        for query in queries:
            response = rag.rag_search(
                RAGSearchRequest(
                    query=query,
                    kb_id=kb_id,
                    top_k=top_k,
                    mode=SearchMode.dense,
                    use_rerank=True,
                    rewrite_query=False,
                )
            )

            items = [
                {
                    "doc_id": hit.doc_id,
                    "doc_title": hit.doc_title,
                    "score": hit.score,
                    "rank": hit.rank,
                    "snippet": hit.text[:200],
                    "source": hit.source,
                }
                for hit in response.items
            ]
            hit = bool(response.ok and response.items)
            if hit:
                hit_count += 1
            total_returned += len(items)

            results.append(
                {
                    "query": query,
                    "ok": response.ok,
                    "hit": hit,
                    "returned_items": len(items),
                    "error": asdict(response.error) if response.error else None,
                    "debug": asdict(response.debug) if response.debug else None,
                    "items": items,
                }
            )

        query_count = len(queries)
        return {
            "kb_id": kb_id,
            "top_k": top_k,
            "query_count": query_count,
            "hit_count": hit_count,
            "hit_rate": round(hit_count / query_count, 4) if query_count else 0.0,
            "avg_returned_items": round(total_returned / query_count, 4) if query_count else 0.0,
            "queries": results,
        }
    finally:
        rag.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="RAG recall evaluator for a knowledge base")
    parser.add_argument("--kb-id", type=int, default=1)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--query", action="append", dest="queries")
    args = parser.parse_args()

    _load_env()
    queries = [q.strip() for q in (args.queries or DEFAULT_QUERIES) if q and q.strip()]
    if not queries:
        raise RuntimeError("At least one query is required")

    payload = {
        "documents": _query_kb_documents(_read_db_dsn(), args.kb_id),
        "evaluation": _run_queries(args.kb_id, args.top_k, queries),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
