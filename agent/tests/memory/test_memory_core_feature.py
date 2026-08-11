"""Tests for core memory feature (差距5: Core Memory 常驻机制).

覆盖场景：
- 核心记忆渲染（动态 token 预算）
- 核心记忆注入 user prompt
- MemoryContext 包含 core_memories
- 核心记忆按 confidence 排序
"""

from __future__ import annotations

from context.memory.core.MemoryContext import MemoryContext
from context.memory.core.MemoryItem import MemoryItem
from context.memory.memory_injector import MemoryInjector

# ── 核心记忆渲染测试 ──


class TestCoreMemoryRendering:
    """Test core memory rendering with token budget."""

    def test_render_basic_core_memories(self) -> None:
        injector = MemoryInjector()
        memories = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="用户是计科专业", confidence=0.9, is_core=True),
            MemoryItem(id=2, user_id=1, kb_id=1, content="偏好简洁回答", confidence=0.8, is_core=True),
        ]
        result = injector._render_core_memories(memories)
        assert "[core_memory]" in result
        assert "用户是计科专业" in result
        assert "偏好简洁回答" in result

    def test_render_sorted_by_confidence(self) -> None:
        injector = MemoryInjector()
        memories = [
            MemoryItem(id=1, user_id=1, kb_id=1, content="低置信度", confidence=0.5, is_core=True),
            MemoryItem(id=2, user_id=1, kb_id=1, content="高置信度", confidence=0.95, is_core=True),
            MemoryItem(id=3, user_id=1, kb_id=1, content="中置信度", confidence=0.7, is_core=True),
        ]
        result = injector._render_core_memories(memories)
        lines = [line for line in result.split("\n") if line.startswith("- ")]
        assert lines[0] == "- 高置信度"
        assert lines[1] == "- 中置信度"
        assert lines[2] == "- 低置信度"

    def test_render_respects_token_budget(self) -> None:
        injector = MemoryInjector()
        # Create many memories with moderate content
        memories = [
            MemoryItem(
                id=i, user_id=1, kb_id=1, content=f"这是第{i}条核心记忆内容", confidence=0.9 - i * 0.03, is_core=True
            )
            for i in range(20)
        ]
        result = injector._render_core_memories(memories, max_tokens=50)
        lines = [line for line in result.split("\n") if line.startswith("- ")]
        # Should not include all 20 memories due to token budget
        assert len(lines) < 20
        assert len(lines) > 0

    def test_render_empty_memories(self) -> None:
        injector = MemoryInjector()
        result = injector._render_core_memories([])
        assert result == "[core_memory]"


# ── 核心记忆注入测试 ──


class TestCoreMemoryInjection:
    """Test core memory injection into model context."""

    def test_core_memories_injected_as_segment(self) -> None:
        injector = MemoryInjector()
        context = MemoryContext(
            short_term=[{"role": "user", "content": "hello"}],
            long_term=[MemoryItem(id=1, user_id=1, kb_id=1, content="普通记忆", confidence=0.7)],
            core_memories=[
                MemoryItem(id=2, user_id=1, kb_id=1, content="核心记忆", confidence=0.9, is_core=True),
            ],
        )
        model_context = injector.build_model_context(context)
        sources = [s.source for s in model_context.segments]
        assert "core_memory" in sources
        assert "memory" in sources

    def test_core_memory_segment_has_high_priority(self) -> None:
        injector = MemoryInjector()
        context = MemoryContext(
            core_memories=[
                MemoryItem(id=1, user_id=1, kb_id=1, content="核心记忆", confidence=0.9, is_core=True),
            ],
        )
        model_context = injector.build_model_context(context)
        core_segment = next(s for s in model_context.segments if s.source == "core_memory")
        assert core_segment.metadata.get("priority") == "high"

    def test_no_core_segment_when_empty(self) -> None:
        injector = MemoryInjector()
        context = MemoryContext(
            long_term=[MemoryItem(id=1, user_id=1, kb_id=1, content="普通记忆", confidence=0.7)],
        )
        model_context = injector.build_model_context(context)
        sources = [s.source for s in model_context.segments]
        assert "core_memory" not in sources

    def test_core_memory_content_in_rendered_output(self) -> None:
        injector = MemoryInjector()
        context = MemoryContext(
            core_memories=[
                MemoryItem(id=1, user_id=1, kb_id=1, content="用户喜欢 Python", confidence=0.9, is_core=True),
            ],
        )
        model_context = injector.build_model_context(context)
        rendered = model_context.render(source_filter={"core_memory"})
        assert "用户喜欢 Python" in rendered
        assert "[core_memory]" in rendered


# ── MemoryContext 测试 ──


class TestMemoryContext:
    """Test MemoryContext data model."""

    def test_default_core_memories(self) -> None:
        ctx = MemoryContext()
        assert ctx.core_memories == []

    def test_core_memories_settable(self) -> None:
        cores = [MemoryItem(id=1, user_id=1, kb_id=1, content="test", is_core=True)]
        ctx = MemoryContext(core_memories=cores)
        assert len(ctx.core_memories) == 1
        assert ctx.core_memories[0].is_core is True
