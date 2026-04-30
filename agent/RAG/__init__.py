from RAG.schema import (
    RAGChunkHit,
    RAGSearchDebugTrace,
    RAGSearchError,
    RAGSearchFilters,
    RAGSearchRequest,
    RAGSearchResponse,
    ScoreType,
    SearchMode,
)


def __getattr__(name: str):
    if name == "DocumentIndexer":
        from RAG.DocumentIndexer import DocumentIndexer

        return DocumentIndexer
    if name == "RAG_service":
        from RAG.RAG_service import RAG_service

        return RAG_service
    raise AttributeError(f"module 'RAG' has no attribute {name!r}")

__all__ = [
    "DocumentIndexer",
    "RAG_service",
    "RAGChunkHit",
    "RAGSearchDebugTrace",
    "RAGSearchError",
    "RAGSearchFilters",
    "RAGSearchRequest",
    "RAGSearchResponse",
    "ScoreType",
    "SearchMode",
]
