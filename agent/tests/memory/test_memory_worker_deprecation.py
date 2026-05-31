from __future__ import annotations

import warnings

from context.memory.pipeline.worker import MemoryWorkerAgent


class _Client:
    async def fetch_pending_tasks(self, limit: int = 10):
        return []


def test_memory_worker_agent_warns_when_instantiated_only() -> None:
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter("always")

        MemoryWorkerAgent(_Client())  # type: ignore[arg-type]

    assert len(captured) == 1
    assert issubclass(captured[0].category, DeprecationWarning)
    assert "MemoryWorkerAgent is deprecated" in str(captured[0].message)
