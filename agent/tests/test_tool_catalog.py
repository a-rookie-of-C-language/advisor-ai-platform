from __future__ import annotations

from tools.tool_catalog import ToolCatalog


class _RagService:
    pass


class _MemoryClient:
    pass


def test_catalog_returns_expected_tools_by_default(monkeypatch) -> None:
    monkeypatch.delenv("FEATURE_MEMORY_TOOLS", raising=False)
    monkeypatch.delenv("FEATURE_WEB_SEARCH", raising=False)
    tools = ToolCatalog.get_all_base_tools(
        rag_service=_RagService(),
        memory_client=_MemoryClient(),
    )
    names = [tool.name for tool in tools]
    assert names == ["rag_search", "memory_read", "memory_write", "web_search"]


def test_catalog_can_disable_memory_tools_by_feature(monkeypatch) -> None:
    monkeypatch.setenv("FEATURE_MEMORY_TOOLS", "false")
    monkeypatch.setenv("FEATURE_WEB_SEARCH", "false")
    tools = ToolCatalog.get_all_base_tools(
        rag_service=_RagService(),
        memory_client=_MemoryClient(),
    )
    names = [tool.name for tool in tools]
    assert names == ["rag_search"]

