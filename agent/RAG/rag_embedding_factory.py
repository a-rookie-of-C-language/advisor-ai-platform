from __future__ import annotations

from openai import OpenAI

from RAG.embedding_engine.base_embedding_engine import BaseEmbeddingEngine
from RAG.embedding_engine.ollama_embedding_engine import OllamaEmbeddingEngine
from RAG.embedding_engine.openai_embedding_engine import OpenAIEmbeddingEngine


def build_embedding_engine(
    *,
    embedding_provider: str,
    embedding_model: str,
    ollama_base_url: str,
    embedding_openai_base_url: str | None,
    embedding_openai_api_key: str | None,
) -> BaseEmbeddingEngine:
    provider = (embedding_provider or "ollama").strip().lower()
    if provider == "openai":
        openai_client = OpenAI(
            api_key=embedding_openai_api_key,
            base_url=embedding_openai_base_url,
        )
        return OpenAIEmbeddingEngine(
            model=embedding_model,
            client=openai_client,
        )
    return OllamaEmbeddingEngine(model=embedding_model, base_url=ollama_base_url)
