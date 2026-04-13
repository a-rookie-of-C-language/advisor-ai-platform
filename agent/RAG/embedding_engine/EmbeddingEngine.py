from typing import List

from langchain_ollama import OllamaEmbeddings


class EmbeddingEngine:
    """负责将文本列表向量化。

    默认使用本地 Ollama 部署的 bge-m3 模型（1024 维）。
    """

    def __init__(self, model: str = "bge-m3", ollama_base_url: str = "http://localhost:11434"):
        self._embeddings = OllamaEmbeddings(
            model=model,
            base_url=ollama_base_url,
        )

    def embed(self, texts: List[str]) -> List[List[float]]:
        """对文本列表进行向量化，返回向量列表。"""
        return self._embeddings.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        """对单个查询文本向量化（检索时使用）。"""
        return self._embeddings.embed_query(text)
