from __future__ import annotations

import logging
from typing import List, Optional

from langchain_ollama import OllamaEmbeddings

from .base_embedding_engine import BaseEmbeddingEngine

LOGGER = logging.getLogger(__name__)


class OllamaEmbeddingEngine(BaseEmbeddingEngine):
    name = "ollama"

    def __init__(
        self,
        model: str = "bge-m3",
        base_url: str = "http://localhost:11434",
    ) -> None:
        LOGGER.info(f"Initializing OllamaEmbeddingEngine: model={model}, base_url={base_url}")
        self._client = OllamaEmbeddings(model=model, base_url=base_url)

    def embed_texts(self, texts: List[str]) -> Optional[List[List[float]]]:
        if not texts:
            return []
        return self._client.embed_documents(texts)
