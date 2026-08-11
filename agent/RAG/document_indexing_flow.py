from __future__ import annotations

import logging
from pathlib import Path

from RAG.annotator.annotation_pipeline import AnnotationPipeline
from RAG.chunk_engine.registry import ChunkEngineRegistry
from RAG.document_annotation import annotate_document_chunks, annotate_document_chunks_async
from RAG.DocumentIndexerStorage import DocumentIndexerStorage
from RAG.embedding_engine.ollama_embedding_engine import OllamaEmbeddingEngine

logger = logging.getLogger(__name__)


class DocumentIndexingFlow:
    def __init__(
        self,
        *,
        storage: DocumentIndexerStorage,
        chunk_registry: ChunkEngineRegistry,
        embedding_engine: OllamaEmbeddingEngine,
        annotation_pipeline: AnnotationPipeline | None,
    ) -> None:
        self._storage = storage
        self._chunk_registry = chunk_registry
        self._embedding_engine = embedding_engine
        self._annotation_pipeline = annotation_pipeline

    async def process_document(self, document_id: int) -> None:
        try:
            await self._storage.set_status(document_id, "INDEXING")
            file_path, _file_type = await self._storage.get_document_info(document_id)

            if not file_path:
                logger.error("file_path 为空，document_id=%s", document_id)
                await self._storage.set_status(document_id, "FAILED")
                return

            path = Path(file_path)
            if not path.exists():
                logger.error("文件不存在，document_id=%s, path=%s", document_id, file_path)
                await self._storage.set_status(document_id, "FAILED")
                return

            engine, _ = self._chunk_registry.select(path, None)
            chunk_results = engine.chunk(path)
            if not chunk_results:
                logger.warning("切块结果为空，document_id=%s", document_id)
                await self._storage.set_status(document_id, "FAILED")
                return

            if self._annotation_pipeline is not None:
                # 使用异步版本，充分利用 asyncio.gather 并行标注
                chunk_results = await self._annotate_chunks_async(chunk_results, document_id)

            texts = [chunk.text for chunk in chunk_results]
            vectors = self._embedding_engine.embed_texts(texts)
            await self._storage.save_chunks(document_id, chunk_results, vectors)
            await self._storage.set_status(document_id, "READY")
            logger.info("索引完成，document_id=%s, chunks=%s", document_id, len(chunk_results))

        except Exception as exc:
            logger.exception("索引失败，document_id=%s, error=%s", document_id, exc)
            await self._storage.set_status(document_id, "FAILED")

    def _annotate_chunks(self, chunk_results: list, document_id: int) -> list:
        """同步版本（保留向后兼容）"""
        assert self._annotation_pipeline is not None
        return annotate_document_chunks(
            chunk_results,
            document_id=document_id,
            annotation_pipeline=self._annotation_pipeline,
        )

    async def _annotate_chunks_async(self, chunk_results: list, document_id: int) -> list:
        """异步版本：使用 asyncio.gather 并行标注"""
        assert self._annotation_pipeline is not None
        return await annotate_document_chunks_async(
            chunk_results,
            document_id=document_id,
            annotation_pipeline=self._annotation_pipeline,
        )
