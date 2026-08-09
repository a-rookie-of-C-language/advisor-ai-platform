from __future__ import annotations

from .runtime import GraphRuntime
from .runtime import _runtime as _runtime_impl


def runtime() -> GraphRuntime:
    return _runtime_impl()
