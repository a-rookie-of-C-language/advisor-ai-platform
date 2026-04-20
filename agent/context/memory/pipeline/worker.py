from __future__ import annotations

import asyncio
import logging
import warnings
from typing import Awaitable, Callable

from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.core.governance import MemoryGovernance
from context.memory.pipeline.session_memory import SessionMemory
from context.memory.pipeline.writeback import MemoryWriteback

warnings.warn(
    "memory.pipeline.worker.MemoryWorkerAgent is deprecated, "
    "use agents.MemoryWorkerSubAgent instead",
    DeprecationWarning,
    stacklevel=2,
)

logger = logging.getLogger(__name__)

Extractor = Callable[[str, str], list | Awaitable[list]]


class MemoryWorkerAgent:
    """Deprecated worker kept for compatibility; prefer agents.MemoryWorkerSubAgent."""

    def __init__(
        self,
        api_client: MemoryApiClient,
        governance: MemoryGovernance | None = None,
        llm_extractor: Extractor | None = None,
        poll_interval_sec: float = 5.0,
        batch_size: int = 10,
        max_retries: int = 3,
    ) -> None:
        self._api_client = api_client
        self._governance = governance or MemoryGovernance()
        self._writeback = MemoryWriteback(governance=self._governance)
        self._session_memory = SessionMemory(governance=self._governance)
        self._llm_extractor = llm_extractor
        self._poll_interval = max(poll_interval_sec, 1.0)
        self._batch_size = max(batch_size, 1)
        self._max_retries = max(max_retries, 0)
        self._running = False

    async def run_once(self) -> dict[str, int]:
        stats = {"fetched": 0, "processed": 0, "done": 0, "failed": 0}
        try:
            tasks = await self._api_client.fetch_pending_tasks(limit=self._batch_size)
            stats["fetched"] = len(tasks)
        except Exception as exc:  # noqa: BLE001
            logger.error("memory_worker_fetch_failed err=%s", exc)
            return stats

        for task in tasks:
            task_id = task.get("id")
            payload = task.get("payload", {})
            user_text = payload.get("user_text", "")
            assistant_text = payload.get("assistant_text", "")
            recent_messages = payload.get("recent_messages", [])
            session_id = task.get("sessionId")
            turn_id = task.get("turnId", "")
            user_id = task.get("userId")
            kb_id = task.get("kbId")

            stats["processed"] += 1
            try:
                candidates = await self._writeback.extract_candidates(
                    user_text=user_text,
                    assistant_text=assistant_text,
                    source_turn_id=turn_id,
                    llm_extractor=self._llm_extractor,
                )
                if candidates:
                    await self._writeback.flush(
                        api_client=self._api_client,
                        user_id=user_id,
                        kb_id=kb_id,
                        candidates=candidates,
                    )

                if session_id and recent_messages and self._session_memory.should_summarize(recent_messages):
                    summary_input = self._session_memory.build_summary_input(recent_messages)
                    await self._api_client.save_session_summary(session_id=session_id, summary=summary_input)

                await self._api_client.mark_task_done(task_id)
                stats["done"] += 1
                logger.debug(
                    "memory_worker_task_done id=%s session=%s candidates=%d",
                    task_id,
                    session_id,
                    len(candidates),
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "memory_worker_task_failed id=%s session=%s err=%s",
                    task_id,
                    session_id,
                    exc,
                )
                try:
                    await self._api_client.mark_task_failed(task_id, str(exc))
                except Exception:  # noqa: BLE001
                    pass
                stats["failed"] += 1

        return stats

    async def run(self) -> None:
        self._running = True
        logger.info(
            "memory_worker_start interval=%.1fs batch=%d",
            self._poll_interval,
            self._batch_size,
        )
        while self._running:
            try:
                stats = await self.run_once()
                if stats["fetched"] == 0:
                    await asyncio.sleep(self._poll_interval)
                else:
                    logger.info(
                        "memory_worker_batch fetched=%d processed=%d done=%d failed=%d",
                        stats["fetched"],
                        stats["processed"],
                        stats["done"],
                        stats["failed"],
                    )
            except asyncio.CancelledError:
                break
            except Exception as exc:  # noqa: BLE001
                logger.error("memory_worker_loop_error err=%s", exc)
                await asyncio.sleep(self._poll_interval)

        logger.info("memory_worker_stop")

    def stop(self) -> None:
        self._running = False

