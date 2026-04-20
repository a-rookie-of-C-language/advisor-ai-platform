from __future__ import annotations

import pytest
from pydantic import BaseModel

from tools.base_tool import BaseTool
from tools.tool_assembly_pool import ToolAssemblyPool
from tools.tool_catalog import ToolCatalog
from tools.tool_result import ToolResult


class _DummyInput(BaseModel):
    v: int = 1


class _DummyTool(BaseTool[_DummyInput, BaseModel]):
    def __init__(self, name: str) -> None:
        super().__init__(name=name, description=name, input_model=_DummyInput)

    async def execute(self, tool_input: _DummyInput, context: dict) -> ToolResult:
        _ = tool_input
        _ = context
        return ToolResult(ok=True, status="ok", message="ok", items=[])


def _set_catalog(monkeypatch, *, builtin: list[BaseTool], custom: list[BaseTool], mcp: list[BaseTool]) -> None:
    monkeypatch.setattr(
        ToolCatalog,
        "get_builtin_tools",
        classmethod(lambda cls, **kwargs: builtin),
    )
    monkeypatch.setattr(
        ToolCatalog,
        "get_custom_tools",
        classmethod(lambda cls, **kwargs: custom),
    )
    monkeypatch.setattr(
        ToolCatalog,
        "get_mcp_tools",
        classmethod(lambda cls, **kwargs: mcp),
    )


def test_assembly_order_and_stable_sort(monkeypatch) -> None:
    _set_catalog(
        monkeypatch,
        builtin=[_DummyTool("b2"), _DummyTool("b1")],
        custom=[_DummyTool("c2"), _DummyTool("c1")],
        mcp=[_DummyTool("m2"), _DummyTool("m1")],
    )
    tools = ToolAssemblyPool.build()
    assert [tool.name for tool in tools] == ["b1", "b2", "c1", "c2", "m1", "m2"]


def test_conflict_policy_keep_first_default(monkeypatch) -> None:
    _set_catalog(
        monkeypatch,
        builtin=[_DummyTool("dup")],
        custom=[_DummyTool("dup")],
        mcp=[],
    )
    tools = ToolAssemblyPool.build()
    assert [tool.name for tool in tools] == ["dup"]
    assert tools[0].description == "dup"


def test_conflict_policy_keep_last(monkeypatch) -> None:
    first = _DummyTool("dup")
    second = _DummyTool("dup")
    second._permission_matcher = "from_last"
    _set_catalog(monkeypatch, builtin=[first], custom=[second], mcp=[])
    tools = ToolAssemblyPool.build(conflict_policy="keep_last")
    assert len(tools) == 1
    assert tools[0].get_permission_matcher(_DummyInput()) == "from_last"


def test_conflict_policy_error(monkeypatch) -> None:
    _set_catalog(
        monkeypatch,
        builtin=[_DummyTool("dup")],
        custom=[_DummyTool("dup")],
        mcp=[],
    )
    with pytest.raises(ValueError, match="duplicate tool name"):
        ToolAssemblyPool.build(conflict_policy="error")

