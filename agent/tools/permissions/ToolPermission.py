from __future__ import annotations

from enum import Enum


class ToolPermission(Enum):
    LLM = "llm"
    MEMORY_READ = "memory_read"
    MEMORY_WRITE = "memory_write"
    TASK_SUBMIT = "task_submit"
    SEARCH = "search"
    RAG_READ = "rag_read"
    SUMMARIZE = "summarize"
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    WORKSPACE_READ = "workspace_read"
    WORKSPACE_WRITE = "workspace_write"
