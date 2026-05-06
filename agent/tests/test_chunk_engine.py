from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from RAG.chunk_engine.base_chunk_engine import BaseChunkEngine, ChunkResult
from RAG.chunk_engine.file_profile import FileProfile
from RAG.chunk_engine.plain_text_chunk_engine import PlainTextChunkEngine


class TestChunkResult:
    def test_chunk_result_creation(self):
        result = ChunkResult(text="test text", metadata={"page": 1})
        assert result.text == "test text"
        assert result.metadata == {"page": 1}

    def test_chunk_result_default_metadata(self):
        result = ChunkResult(text="test")
        assert result.metadata == {}


class TestBaseChunkEngine:
    def test_split_text_empty(self):
        class DummyEngine(BaseChunkEngine):
            def can_handle(self, profile: FileProfile) -> float:
                return 0.0

            def extract_text(self, file_path: Path) -> str:
                return ""

        engine = DummyEngine()
        assert engine.split_text("") == []
        assert engine.split_text("   ") == []

    def test_split_text_short(self):
        class DummyEngine(BaseChunkEngine):
            def can_handle(self, profile: FileProfile) -> float:
                return 0.0

            def extract_text(self, file_path: Path) -> str:
                return ""

        engine = DummyEngine()
        chunks = engine.split_text("short text", chunk_size=100)
        assert len(chunks) == 1
        assert chunks[0].text == "short text"

    def test_split_text_with_overlap(self):
        class DummyEngine(BaseChunkEngine):
            def can_handle(self, profile: FileProfile) -> float:
                return 0.0

            def extract_text(self, file_path: Path) -> str:
                return ""

        engine = DummyEngine()
        text = "a" * 200
        chunks = engine.split_text(text, chunk_size=100, overlap=20)
        assert len(chunks) > 1
        # First chunk should be 100 chars
        assert len(chunks[0].text) == 100

    def test_split_text_with_metadata(self):
        class DummyEngine(BaseChunkEngine):
            def can_handle(self, profile: FileProfile) -> float:
                return 0.0

            def extract_text(self, file_path: Path) -> str:
                return ""

        engine = DummyEngine()
        metadata = {"source": "test.pdf"}
        chunks = engine.split_text("test text", base_metadata=metadata)
        assert chunks[0].metadata == {"source": "test.pdf"}


class TestPlainTextChunkEngine:
    def test_can_handle(self):
        engine = PlainTextChunkEngine()
        profile = FileProfile(file_type="txt", mime_type="text/plain")
        assert engine.can_handle(profile) > 0.5

    def test_extract_text(self):
        engine = PlainTextChunkEngine()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("Hello, World!")
            f.flush()
            text = engine.extract_text(Path(f.name))
            assert text == "Hello, World!"

    def test_chunk_integration(self):
        engine = PlainTextChunkEngine()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("This is a test document with some content.")
            f.flush()
            chunks = engine.chunk(Path(f.name))
            assert len(chunks) > 0
            assert chunks[0].text.strip() != ""
