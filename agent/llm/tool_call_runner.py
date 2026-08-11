from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from llm.base_provider import ToolExecutor
from llm.llm_stream_event import LLMStreamEvent
from llm.tool_call_payloads import (
    build_tool_call_event,
    build_tool_error_output,
    build_tool_result_event,
)
from llm.ToolCallFSM import ToolCallFSM


@dataclass(frozen=True)
class ToolCallRunResult:
    tool_name: str
    tool_call_id: str
    tool_output: str
    events: list[LLMStreamEvent]


async def run_tool_call(
    raw_call: Any,
    *,
    tool_executor: ToolExecutor,
    max_tool_retries: int,
) -> ToolCallRunResult:
    tool_name = raw_call.function.name
    tool_call_id = raw_call.id or ""
    args_text = raw_call.function.arguments or "{}"
    fsm = ToolCallFSM(
        tool_name,
        args_text,
        call_id=tool_call_id,
        max_args_retries=2,
        max_exec_retries=max_tool_retries,
    )

    try:
        import json

        tool_args = json.loads(args_text)
    except Exception:
        tool_args = None  # type: ignore[assignment]

    if not fsm.validate_args(tool_args):
        if fsm.state.value == "args_retry":
            error_output = build_tool_error_output(f"Invalid JSON in tool arguments: {args_text[:200]}")
            return ToolCallRunResult(
                tool_name=tool_name,
                tool_call_id=tool_call_id,
                tool_output=error_output,
                events=[
                    build_tool_call_event(tool_name, {}),
                    build_tool_result_event(
                        tool_name=tool_name,
                        tool_args={},
                        tool_output=error_output,
                        attempt=0,
                        success=False,
                    ),
                ],
            )

        error_output = build_tool_error_output(f"tool_args_parse_exhausted: {args_text[:200]}")
        return ToolCallRunResult(
            tool_name=tool_name,
            tool_call_id=tool_call_id,
            tool_output=error_output,
            events=[
                build_tool_call_event(tool_name, {}),
                build_tool_result_event(
                    tool_name=tool_name,
                    tool_args={},
                    tool_output=error_output,
                    attempt=fsm.context.attempt,
                    success=False,
                ),
            ],
        )

    events = [build_tool_call_event(tool_name, fsm.context.tool_args)]
    last_error = ""
    tool_output = ""
    success = False
    used_attempt = 0
    for attempt in range(1, max_tool_retries + 1):
        used_attempt = attempt
        try:
            try:
                tool_output = await tool_executor(
                    tool_name,
                    fsm.context.tool_args,
                    idempotency_key=fsm.idempotency_key,
                )
            except TypeError as exc:
                if "idempotency_key" not in str(exc):
                    raise
                tool_output = await tool_executor(tool_name, fsm.context.tool_args)
            success = True
            fsm.record_execution(tool_output, success=True)
            break
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            fsm.record_execution(str(exc), success=False)
            if fsm.state.value == "failed":
                break

    if not success:
        tool_output = build_tool_error_output(f"tool_execute_failed: {last_error}")

    events.append(
        build_tool_result_event(
            tool_name=tool_name,
            tool_args=fsm.context.tool_args,
            tool_output=tool_output,
            attempt=used_attempt,
            success=success,
        )
    )
    return ToolCallRunResult(
        tool_name=tool_name,
        tool_call_id=tool_call_id,
        tool_output=tool_output,
        events=events,
    )
