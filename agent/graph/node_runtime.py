from __future__ import annotations

from .runtime import GraphRuntime, _runtime as _runtime_impl


def runtime() -> GraphRuntime:
    return _runtime_impl()
