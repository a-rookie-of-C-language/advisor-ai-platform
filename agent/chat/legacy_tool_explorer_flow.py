from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from agents.tool_explorer import ToolExplorerSubAgent
from chat.legacy_route_support import build_explorer_route_context
from chat.legacy_subagent_events import (
    build_delegate_reasoning_payload,
    explorer_event_source,
)
from chat.stream_message_utils import build_explorer_context
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec


@dataclass(frozen=True)
class LegacyToolExplorerContext:
    used: bool = False
    events: list[str] = field(default_factory=list)
    dynamic_prompt: str = ""


async def prepare_legacy_tool_explorer_context(
    *,
    exploration_query: bool,
    tool_explorer_subagent: ToolExplorerSubAgent | None,
    user_query: str,
    validated_messages: list[ChatMessage],
    available_tools: list[ToolSpec],
    route_decision,
    matched_tools: list[str],
    serialize_protocol_event: Callable[..., str],
    trace_id: str | None,
) -> LegacyToolExplorerContext:
    if not exploration_query or tool_explorer_subagent is None:
        return LegacyToolExplorerContext()

    events = [
        serialize_protocol_event(
            event="sys_reasoning",
            source="system",
            trace_id=trace_id,
            payload=build_delegate_reasoning_payload("tool_explorer_subagent"),
        )
    ]
    outcome = await tool_explorer_subagent.explore(
        user_query=user_query,
        recent_messages=validated_messages,
        available_tools=available_tools,
        route_context=build_explorer_route_context(
            route_decision=route_decision,
            matched_tools=matched_tools,
        ),
    )
    if not outcome.used:
        return LegacyToolExplorerContext(events=events)

    for explorer_event in outcome.events:
        events.append(
            serialize_protocol_event(
                event=explorer_event.event,
                source=explorer_event_source(explorer_event.event),
                trace_id=trace_id,
                payload=explorer_event.payload,
            )
        )
    return LegacyToolExplorerContext(
        used=True,
        events=events,
        dynamic_prompt=build_explorer_context(outcome),
    )
