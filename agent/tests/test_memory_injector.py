from __future__ import annotations

from agent.context.memory.core.schema import MemoryContext, MemoryItem
from agent.context.memory.memory_injector import MemoryInjector


def test_memory_injector_only_outputs_memory_segment() -> None:
    injector = MemoryInjector()
    memory_context = MemoryContext(
        short_term=[{"role": "user", "content": "hello"}],
        long_term=[MemoryItem(id=1, user_id=1, kb_id=1, content="喜欢咖啡", confidence=0.9)],
        summary=None,
    )
    model_context = injector.build_model_context(memory_context)
    assert len(model_context.segments) == 1
    assert model_context.segments[0].source == "memory"
    rendered = model_context.render(source_filter={"memory"})
    assert "long_term_memory" in rendered
    assert "喜欢咖啡" in rendered

