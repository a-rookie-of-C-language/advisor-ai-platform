from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from llm.base_provider import BaseLLMProvider

ROOT = Path(__file__).resolve().parents[1]


def ensure_sys_path() -> None:
    """确保 ROOT 在 sys.path 中。"""
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))


def load_env() -> None:
    """加载 .env 配置。"""
    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
    except ImportError:
        pass


def build_rag_service_from_env():
    from RAG.RAG_service import RAG_service

    db_dsn = os.getenv("DATABASE_URL", "").strip()
    if not db_dsn:
        raise RuntimeError("未配置 DATABASE_URL")

    return RAG_service(
        db_dsn=db_dsn,
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "bge-m3"),
    )


def build_annotation_pipeline(logger: logging.Logger):
    from RAG.annotator.annotation_pipeline import AnnotationPipeline
    from RAG.annotator.rule_annotator import RuleAnnotator

    annotators = [RuleAnnotator()]

    try:
        from RAG.annotator.hanlp_annotator import HanlpAnnotator

        annotators.append(HanlpAnnotator())
    except Exception:
        logger.debug("HanLP 未启用，跳过")

    try:
        from RAG.annotator.llm_annotator import LlmAnnotator

        annotators.append(LlmAnnotator())
    except Exception:
        logger.debug("LLM 标注器未启用，跳过")

    return AnnotationPipeline(annotators=annotators)


def build_chat_service(llm_provider: BaseLLMProvider | None):
    from chat.stream_service import ChatStreamService
    from llm.provider_factory import build_provider_from_env

    provider = llm_provider or build_provider_from_env()
    return ChatStreamService(provider=provider)
