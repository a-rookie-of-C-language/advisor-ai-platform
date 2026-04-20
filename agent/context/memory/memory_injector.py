from __future__ import annotations

from agent.context.model_context import ContextSegment, ModelContext
from agent.context.memory.core.schema import MemoryContext
from agent.context.memory.pipeline.work_memory import WorkMemory


class MemoryInjector:
    """长期记忆到模型上下文的单向注入器。"""

    def __init__(self, renderer: WorkMemory | None = None) -> None:
        self._renderer = renderer or WorkMemory()

    def build_model_context(self, memory_context: MemoryContext) -> ModelContext:
        model_context = ModelContext()
        prompt = self._renderer.render_for_prompt(memory_context)
        if prompt:
            model_context.add_segment(
                ContextSegment(
                    source="memory",
                    content=prompt,
                    metadata={"injected": True},
                )
            )
        return model_context

