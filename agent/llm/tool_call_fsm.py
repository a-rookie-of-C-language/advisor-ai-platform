from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class ToolCallState(Enum):
    INIT = "init"
    ARGS_VALIDATING = "args_validating"
    ARGS_RETRY = "args_retry"
    EXECUTING = "executing"
    RESULT_VALIDATING = "result_validating"
    DONE = "done"
    FAILED = "failed"


@dataclass
class ToolCallContext:
    tool_name: str
    args_text: str = ""
    tool_args: dict[str, Any] = field(default_factory=dict)
    tool_output: str = ""
    attempt: int = 0
    last_error: str = ""


class ToolCallFSM:
    """Finite State Machine for tool call lifecycle.

    State transitions:
        INIT → ARGS_VALIDATING → EXECUTING → RESULT_VALIDATING → DONE
                  ↓ (parse fail)
              ARGS_RETRY → ARGS_VALIDATING  (up to max_args_retries)
                  ↓ (exhausted)
                FAILED
    """

    def __init__(
        self,
        tool_name: str,
        args_text: str,
        *,
        call_id: str = "",
        max_args_retries: int = 2,
        max_exec_retries: int = 3,
    ) -> None:
        self._max_args_retries = max_args_retries
        self._max_exec_retries = max_exec_retries
        self._state = ToolCallState.INIT
        self._ctx = ToolCallContext(tool_name=tool_name, args_text=args_text)
        self._args_retry_count = 0
        self._exec_retry_count = 0
        self._idempotency_key = self._build_idempotency_key(tool_name, args_text, call_id)

    @property
    def state(self) -> ToolCallState:
        return self._state

    @property
    def idempotency_key(self) -> str:
        return self._idempotency_key

    @staticmethod
    def _build_idempotency_key(tool_name: str, args_text: str, call_id: str) -> str:
        args_hash = hashlib.sha256(args_text.encode("utf-8")).hexdigest()[:16]
        return f"{tool_name}:{args_hash}:{call_id}"

    @property
    def context(self) -> ToolCallContext:
        return self._ctx

    @property
    def is_terminal(self) -> bool:
        return self._state in (ToolCallState.DONE, ToolCallState.FAILED)

    def validate_args(self, parsed_args: dict[str, Any] | None) -> bool:
        """Validate parsed tool arguments. Returns True if valid."""
        if self._state not in (ToolCallState.INIT, ToolCallState.ARGS_RETRY):
            logger.warning("tool_call_fsm: validate_args called in state %s", self._state)
            return False

        self._state = ToolCallState.ARGS_VALIDATING

        if parsed_args is None:
            self._ctx.last_error = "args_parse_failed"
            self._args_retry_count += 1
            if self._args_retry_count <= self._max_args_retries:
                self._state = ToolCallState.ARGS_RETRY
                logger.info(
                    "tool_call_fsm: args parse failed, retry %d/%d for tool=%s",
                    self._args_retry_count,
                    self._max_args_retries,
                    self._ctx.tool_name,
                )
            else:
                self._state = ToolCallState.FAILED
                logger.warning(
                    "tool_call_fsm: args parse exhausted after %d retries for tool=%s",
                    self._args_retry_count,
                    self._ctx.tool_name,
                )
            return False

        self._ctx.tool_args = parsed_args
        self._state = ToolCallState.EXECUTING
        return True

    def record_execution(self, output: str, *, success: bool) -> bool:
        """Record tool execution result. Returns True if done."""
        if self._state != ToolCallState.EXECUTING:
            logger.warning("tool_call_fsm: record_execution called in state %s", self._state)
            return False

        self._ctx.tool_output = output
        self._state = ToolCallState.RESULT_VALIDATING

        if success:
            self._state = ToolCallState.DONE
            return True

        self._exec_retry_count += 1
        if self._exec_retry_count <= self._max_exec_retries:
            self._state = ToolCallState.EXECUTING
            logger.info(
                "tool_call_fsm: execution failed, retry %d/%d for tool=%s",
                self._exec_retry_count,
                self._max_exec_retries,
                self._ctx.tool_name,
            )
            return False

        self._state = ToolCallState.FAILED
        logger.warning(
            "tool_call_fsm: execution exhausted after %d retries for tool=%s",
            self._exec_retry_count,
            self._ctx.tool_name,
        )
        return True

    def fail(self, reason: str) -> None:
        """Force transition to FAILED state."""
        self._ctx.last_error = reason
        self._state = ToolCallState.FAILED
