from __future__ import annotations

from context.ContextSegment import ContextSegment
from context.memory.core.MemoryContext import MemoryContext
from context.memory.pipeline.work_memory import WorkMemory
from context.ModelContext import ModelContext


class MemoryInjector:
    """Inject long-term memory content into model context as memory segment."""

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
