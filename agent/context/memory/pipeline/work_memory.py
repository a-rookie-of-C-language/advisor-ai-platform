from __future__ import annotations

from agent.context.memory.core.schema import MemoryContext, MemoryItem, SessionSummary


class WorkMemory:
    def build_context(
        self,
        short_term: list[dict[str, str]],
        long_term: list[MemoryItem],
        summary: SessionSummary | None,
    ) -> MemoryContext:
        return MemoryContext(short_term=short_term, long_term=long_term, summary=summary)

    def render_for_prompt(self, context: MemoryContext, max_long_term: int = 6) -> str:
        lines: list[str] = []

        if context.summary and context.summary.summary.strip():
            lines.append("[session_summary]")
            lines.append(context.summary.summary.strip())

        if context.long_term:
            lines.append("[long_term_memory]")
            for index, item in enumerate(context.long_term[:max_long_term], start=1):
                lines.append(f"{index}. {item.content} (confidence={item.confidence:.2f})")

        if context.short_term:
            lines.append("[recent_dialogue]")
            for message in context.short_term:
                role = message.get("role", "unknown")
                content = message.get("content", "")
                lines.append(f"{role}: {content}")

        return "\n".join(lines).strip()
