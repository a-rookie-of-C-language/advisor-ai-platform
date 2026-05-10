from __future__ import annotations

from typing import List, Optional
from unittest.mock import MagicMock, patch

import pytest

from RAG.embedding_engine.base_embedding_engine import BaseEmbeddingEngine


class TestBaseEmbeddingEngine:
    def test_abstract_methods(self):
        """BaseEmbeddingEngine cannot be instantiated directly."""
        with pytest.raises(TypeError):
            BaseEmbeddingEngine()

    def test_concrete_implementation(self):
        class TestEngine(BaseEmbeddingEngine):
            name = "test"

            def embed_texts(self, texts: List[str]) -> Optional[List[List[float]]]:
                return [[0.1, 0.2, 0.3] for _ in texts]

        engine = TestEngine()
        result = engine.embed_texts(["hello", "world"])
        assert result is not None
        assert len(result) == 2
        assert len(result[0]) == 3

    def test_none_return(self):
        class TestEngine(BaseEmbeddingEngine):
            name = "test"

            def embed_texts(self, texts: List[str]) -> Optional[List[List[float]]]:
                return None

        engine = TestEngine()
        result = engine.embed_texts(["hello"])
        assert result is None


class TestOllamaEmbeddingEngine:
    @patch("RAG.embedding_engine.ollama_embedding_engine.OllamaEmbeddings")
    def test_embed_texts_success(self, mock_embeddings_cls):
        mock_client = MagicMock()
        mock_client.embed_documents.return_value = [[0.1, 0.2], [0.3, 0.4]]
        mock_embeddings_cls.return_value = mock_client

        from RAG.embedding_engine.ollama_embedding_engine import OllamaEmbeddingEngine

        engine = OllamaEmbeddingEngine(model="bge-m3")
        result = engine.embed_texts(["hello", "world"])
        assert result is not None
        assert len(result) == 2
        mock_client.embed_documents.assert_called_once_with(["hello", "world"])

    @patch("RAG.embedding_engine.ollama_embedding_engine.OllamaEmbeddings")
    def test_embed_texts_failure(self, mock_embeddings_cls):
        mock_client = MagicMock()
        mock_client.embed_documents.side_effect = Exception("Connection refused")
        mock_embeddings_cls.return_value = mock_client

        from RAG.embedding_engine.ollama_embedding_engine import OllamaEmbeddingEngine

        engine = OllamaEmbeddingEngine(model="bge-m3")
        with pytest.raises(Exception, match="Connection refused"):
            engine.embed_texts(["hello"])
