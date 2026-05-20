from __future__ import annotations

from typing import Any, Literal

from tools.base_tool import BaseTool
from tools.tool_catalog import ToolCatalog

ConflictPolicy = Literal["keep_first", "keep_last", "error"]


class ToolAssemblyPool:
    """工具组装池：按 builtin -> custom -> mcp 顺序稳定组装并去重。"""

    @classmethod
    def build(
        cls,
        *,
        rag_service: Any | None = None,
        memory_client: Any | None = None,
        conflict_policy: ConflictPolicy = "keep_first",
    ) -> list[BaseTool]:
        import asyncio
        try:
            # 尝试获取运行中的事件循环
            loop = asyncio.get_running_loop()
            # 在已有事件循环中，使用 nest_asyncio 或者在新的线程中运行
            import threading
            result = None
            exception = None

            def run_in_thread():
                nonlocal result, exception
                try:
                    result = asyncio.run(cls._build_async(
                        rag_service=rag_service,
                        memory_client=memory_client,
                        conflict_policy=conflict_policy,
                    ))
                except Exception as e:
                    nonlocal exception
                    exception = e

            thread = threading.Thread(target=run_in_thread)
            thread.start()
            thread.join()

            if exception:
                raise exception
            return result
        except RuntimeError:
            # 没有运行中的事件循环，直接用 asyncio.run()
            return asyncio.run(cls._build_async(
                rag_service=rag_service,
                memory_client=memory_client,
                conflict_policy=conflict_policy,
            ))

    @classmethod
    async def _build_async(
        cls,
        *,
        rag_service: Any | None = None,
        memory_client: Any | None = None,
        conflict_policy: ConflictPolicy = "keep_first",
    ) -> list[BaseTool]:
        builtin_tools = sorted(
            ToolCatalog.get_builtin_tools(
                rag_service=rag_service,
                memory_client=memory_client,
            ),
            key=lambda tool: tool.name,
        )
        custom_tools = sorted(
            ToolCatalog.get_custom_tools(
                rag_service=rag_service,
                memory_client=memory_client,
            ),
            key=lambda tool: tool.name,
        )
        mcp_tools = sorted(
            await ToolCatalog.get_mcp_tools(
                rag_service=rag_service,
                memory_client=memory_client,
            ),
            key=lambda tool: tool.name,
        )
        ordered = builtin_tools + custom_tools + mcp_tools
        return cls._dedupe(ordered, conflict_policy=conflict_policy)

    @staticmethod
    def _dedupe(tools: list[BaseTool], *, conflict_policy: ConflictPolicy) -> list[BaseTool]:
        if conflict_policy not in {"keep_first", "keep_last", "error"}:
            raise ValueError(f"unsupported conflict policy: {conflict_policy}")

        resolved: list[BaseTool] = []
        name_to_idx: dict[str, int] = {}
        for tool in tools:
            current_idx = name_to_idx.get(tool.name)
            if current_idx is None:
                name_to_idx[tool.name] = len(resolved)
                resolved.append(tool)
                continue

            if conflict_policy == "keep_first":
                continue
            if conflict_policy == "keep_last":
                resolved[current_idx] = tool
                continue
            raise ValueError(f"duplicate tool name: {tool.name}")
        return resolved

