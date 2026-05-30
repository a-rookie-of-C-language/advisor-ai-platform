from __future__ import annotations

from context.ContextSegment import ContextSegment
from context.memory.core.MemoryContext import MemoryContext
from context.memory.core.MemoryItem import MemoryItem
from context.memory.pipeline.work_memory import WorkMemory
from context.ModelContext import ModelContext


class MemoryInjector:
    """Inject long-term memory content into model context as memory segment."""

    def __init__(self, renderer: WorkMemory | None = None) -> None:
        self._renderer = renderer or WorkMemory()

    def build_model_context(self, memory_context: MemoryContext) -> ModelContext:
        model_context = ModelContext()

        # Core memories injected at the beginning of user prompt
        if memory_context.core_memories:
            core_prompt = self._render_core_memories(memory_context.core_memories)
            model_context.add_segment(
                ContextSegment(
                    source="core_memory",
                    content=core_prompt,
                    metadata={"injected": True, "priority": "high"},
                )
            )

        # Regular memory (long-term + short-term + summary)
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

    @staticmethod
    def _render_core_memories(memories: list[MemoryItem], max_tokens: int = 500) -> str:
        """Render core memories with dynamic token budget.

        Prioritizes higher confidence memories and respects token limit.
        """
        lines = ["[core_memory]"]
        current_tokens = 0

        # Sort by confidence descending
        sorted_memories = sorted(memories, key=lambda m: m.confidence, reverse=True)

        for m in sorted_memories:
            # Simple token estimation: ~2 chars per token for Chinese
            estimated_tokens = max(len(m.content) // 2, 1)
            if current_tokens + estimated_tokens > max_tokens:
                break
            lines.append(f"- {m.content}")
            current_tokens += estimated_tokens

        return "\n".join(lines)
