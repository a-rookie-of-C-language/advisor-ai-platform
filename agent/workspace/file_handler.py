"""工作区文件处理模块：按类型提取文本或转 base64，供 LLM 使用。"""

from __future__ import annotations

import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
DOC_EXTENSIONS = {"pdf", "docx", "md", "txt"}


def is_image(file_type: str) -> bool:
    return file_type.lower() in IMAGE_EXTENSIONS


def is_document(file_type: str) -> bool:
    return file_type.lower() in DOC_EXTENSIONS


def read_image_base64(file_path: str) -> str:
    """读取图片文件并返回 base64 编码。"""
    data = Path(file_path).read_bytes()
    return base64.b64encode(data).decode("utf-8")


def get_mime_type(file_type: str) -> str:
    """根据文件扩展名返回 MIME 类型。"""
    mapping = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp",
    }
    return mapping.get(file_type.lower(), "application/octet-stream")


def extract_pdf_text(file_path: str) -> str:
    """从 PDF 提取文本。"""
    try:
        import PyPDF2

        reader = PyPDF2.PdfReader(file_path)
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages)
    except Exception as e:
        logger.warning("PDF 文本提取失败: %s", e)
        return f"[PDF 文本提取失败: {e}]"


def extract_docx_text(file_path: str) -> str:
    """从 Word 文档提取文本。"""
    try:
        from docx import Document

        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except Exception as e:
        logger.warning("Word 文本提取失败: %s", e)
        return f"[Word 文本提取失败: {e}]"


def extract_markdown_text(file_path: str) -> str:
    """读取 Markdown 或纯文本文件。"""
    try:
        return Path(file_path).read_text(encoding="utf-8")
    except Exception as e:
        logger.warning("文本文件读取失败: %s", e)
        return f"[文本文件读取失败: {e}]"


def extract_text(file_path: str, file_type: str) -> str:
    """根据文件类型提取文本内容。"""
    ext = file_type.lower()
    if ext == "pdf":
        return extract_pdf_text(file_path)
    elif ext == "docx":
        return extract_docx_text(file_path)
    elif ext in ("md", "txt"):
        return extract_markdown_text(file_path)
    else:
        return f"[不支持的文档类型: {file_type}]"


class AttachmentInfo:
    """附件信息。"""

    __slots__ = ("id", "file_name", "file_type", "file_path")

    def __init__(
        self, id: int, file_name: str, file_type: str, file_path: str
    ) -> None:
        self.id = id
        self.file_name = file_name
        self.file_type = file_type
        self.file_path = file_path

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "file_path": self.file_path,
        }
