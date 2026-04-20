from __future__ import annotations

from dataclasses import dataclass, field
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


@dataclass
class PermissionConfig:
    allowed_tools: set[ToolPermission] = field(default_factory=set)
    read_resources: set[str] = field(default_factory=lambda: {"context", "memory"})
    write_resources: set[str] = field(default_factory=set)

    def allows_tool(self, tool: ToolPermission) -> bool:
        return tool in self.allowed_tools

    def allows_read(self, resource: str) -> bool:
        return resource in self.read_resources

    def allows_write(self, resource: str) -> bool:
        return resource in self.write_resources

    @classmethod
    def memory_worker(cls) -> "PermissionConfig":
        return cls(
            allowed_tools={ToolPermission.LLM, ToolPermission.MEMORY_READ, ToolPermission.MEMORY_WRITE},
            read_resources={"context", "memory"},
            write_resources={"memory"},
        )
