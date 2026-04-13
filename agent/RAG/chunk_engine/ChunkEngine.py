from pathlib import Path
from typing import List

from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain.text_splitter import RecursiveCharacterTextSplitter


class ChunkEngine:
    """负责文档加载与文本切块。

    支持格式：PDF、DOCX/DOC、TXT、Markdown。
    返回切块后的纯文本列表，供 EmbeddingEngine 向量化。
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

    def load_and_split(self, file_path: str, file_type: str) -> List[str]:
        """加载文件并切块，返回文本片段列表。"""
        loader = self._get_loader(file_path, file_type)
        docs = loader.load()
        chunks = self._splitter.split_documents(docs)
        return [c.page_content for c in chunks]

    # ── 内部 ──

    def _get_loader(self, file_path: str, file_type: str):
        ft = file_type.lower()
        if ft == "pdf":
            return PyPDFLoader(file_path)
        if ft in ("docx", "doc"):
            return Docx2txtLoader(file_path)
        if ft == "md":
            return UnstructuredMarkdownLoader(file_path)
        # 默认按纯文本处理（txt 等）
        return TextLoader(file_path, encoding="utf-8")
