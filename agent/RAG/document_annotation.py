from __future__ import annotations

import asyncio
import logging

from RAG.annotator.ChunkAnnotation import ChunkAnnotation
from RAG.annotator.annotation_pipeline import AnnotationPipeline

logger = logging.getLogger(__name__)


def annotate_document_chunks(
    chunk_results: list,
    *,
    document_id: int,
    annotation_pipeline: AnnotationPipeline,
) -> list:
    """对每个切片执行三层标注（同步版本），将结果合并到 metadata。"""
    annotated = []
    failed_count = 0
    for chunk in chunk_results:
        ann: ChunkAnnotation = annotation_pipeline.annotate_chunk(chunk.text)
        if ann.confidence <= 0.0:
            failed_count += 1
        _merge_annotation(chunk, ann)
        annotated.append(chunk)

    _log_result(document_id, len(chunk_results), failed_count, "sync")
    return annotated


async def annotate_document_chunks_async(
    chunk_results: list,
    *,
    document_id: int,
    annotation_pipeline: AnnotationPipeline,
) -> list:
    """对每个切片执行三层标注（异步版本），将结果合并到 metadata。

    优化：使用 asyncio.gather 并行处理所有切片的标注，充分利用异步 IO。
    """
    if not chunk_results:
        return []

    async def _annotate_single(chunk):
        ann = await annotation_pipeline.annotate_chunk_async(chunk.text)
        _merge_annotation(chunk, ann)
        return chunk, ann

    results = await asyncio.gather(*[_annotate_single(c) for c in chunk_results], return_exceptions=True)

    failed_count = 0
    annotated = []
    for result in results:
        if isinstance(result, Exception):
            logger.warning("标注任务异常: %s", result, exc_info=True)
            failed_count += 1
            continue
        chunk, ann = result
        if ann.confidence <= 0.0:
            failed_count += 1
        annotated.append(chunk)

    _log_result(document_id, len(chunk_results), failed_count, "async")
    return annotated


def _merge_annotation(chunk, ann: ChunkAnnotation) -> None:
    chunk.metadata["type"] = ann.type
    chunk.metadata["authority"] = ann.authority
    chunk.metadata["effective_date"] = ann.effective_date
    chunk.metadata["annotation_source"] = ann.source
    chunk.metadata["annotation_confidence"] = ann.confidence
    if ann.extra:
        chunk.metadata.update(ann.extra)


def _log_result(document_id: int, total: int, failed_count: int, mode: str) -> None:
    if failed_count == total:
        logger.warning("所有切片标注失败，document_id=%s", document_id)
        raise ValueError(f"文档质量不足，所有 {total} 个切片均无法标注元数据")
    logger.info(
        "标注完成，document_id=%s, total=%d, failed=%d, mode=%s",
        document_id,
        total,
        failed_count,
        mode,
    )