from __future__ import annotations

from typing import Any

from skills.presets import build_default_registry
from tools.expand_skill import ExpandSkillTool
from tools.tool_assembly_pool import ToolAssemblyPool
from tools.tool_permission import PermissionConfig, ToolPermission
from tools.tool_registry import ToolRegistry
from tools.tool_search import ToolSearchTool


def build_stream_tool_permission() -> PermissionConfig:
    return PermissionConfig.from_allowed_tools(
        {
            ToolPermission.RAG_READ,
            ToolPermission.MEMORY_READ,
            ToolPermission.MEMORY_WRITE,
            ToolPermission.WORKSPACE_READ,
            ToolPermission.WORKSPACE_WRITE,
            ToolPermission.SEARCH,
        },
        read_resources={"context", "memory", "workspace"},
        write_resources={"memory", "workspace"},
    )


def build_stream_tool_registry(
    *,
    enabled_tools: set[str],
    rag_service: Any,
    memory_client: Any,
) -> tuple[ToolRegistry, list[Any], Any, ToolSearchTool]:
    registry = ToolRegistry(enabled_tools=enabled_tools)
    assembled_tools = ToolAssemblyPool.build(
        rag_service=rag_service,
        memory_client=memory_client,
    )
    for tool in assembled_tools:
        registry.register(tool)

    skill_registry = build_default_registry()
    registry.register(ExpandSkillTool(skill_registry))
    tool_search_tool = ToolSearchTool(lambda: registry.specs())
    registry.register(tool_search_tool)
    return registry, assembled_tools, skill_registry, tool_search_tool


def build_stream_health(
    *,
    use_langgraph: bool,
    enable_tool_use: bool,
    debug_stream: bool,
    enabled_tools: set[str],
    tools: ToolRegistry,
    memory_orchestrator: Any,
    llm_extractor: Any,
    compaction_stats: dict[str, Any],
    graph_health: dict[str, Any],
    action_score: dict[str, Any],
) -> dict[str, Any]:
    return {
        "use_langgraph": use_langgraph,
        "enable_tool_use": enable_tool_use,
        "debug_stream": debug_stream,
        "enabled_tools": sorted(enabled_tools) if enabled_tools else [],
        "registered_tools": [spec.name for spec in tools.specs()],
        "memory_enabled": memory_orchestrator is not None,
        "llm_extractor_enabled": llm_extractor is not None,
        "context_compaction": compaction_stats,
        "graph": graph_health,
        "action_score": action_score,
    }
