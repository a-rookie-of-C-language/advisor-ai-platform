from __future__ import annotations

from agent.json_types import JsonObject, JsonValue
from dataclasses import dataclass, field


@dataclass(slots=True)
class ContextSegment:
    source: str
    content: str
    metadata: JsonObject = field(default_factory=dict)


@dataclass(slots=True)
class ModelContext:
    segments: list[ContextSegment] = field(default_factory=list)

    def add_segment(self, segment: ContextSegment) -> None:
        if segment.content.strip():
            self.segments.append(segment)

    def render(self, source_filter: set[str] | None = None) -> str:
        lines: list[str] = []
        for segment in self.segments:
            if source_filter is not None and segment.source not in source_filter:
                continue
            if segment.content.strip():
                lines.append(segment.content.strip())
        return "\n".join(lines).strip()
