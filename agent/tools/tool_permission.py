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
    # context: 模型推理期上下文资源
    # memory: 长期记忆资源（只允许通过注入器进入context）
    read_resources: set[str] = field(default_factory=lambda: {"context", "memory"})
    write_resources: set[str] = field(default_factory=set)

    def allows_tool(self, tool: ToolPermission) -> bool:
        return tool in self.allowed_tools

    def allows_read(self, resource: str) -> bool:
        return resource in self.read_resources

    def allows_write(self, resource: str) -> bool:
        return resource in self.write_resources

    def allows_all(self, required: set[ToolPermission]) -> bool:
        return required.issubset(self.allowed_tools)

    def is_subset_of(self, other: "PermissionConfig") -> bool:
        return (
            self.allowed_tools.issubset(other.allowed_tools)
            and self.read_resources.issubset(other.read_resources)
            and self.write_resources.issubset(other.write_resources)
        )
