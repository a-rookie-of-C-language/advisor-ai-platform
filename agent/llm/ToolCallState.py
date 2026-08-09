from __future__ import annotations

from enum import Enum


class ToolCallState(Enum):
    INIT = "init"
    ARGS_VALIDATING = "args_validating"
    ARGS_RETRY = "args_retry"
    EXECUTING = "executing"
    RESULT_VALIDATING = "result_validating"
    DONE = "done"
    FAILED = "failed"
