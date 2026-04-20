from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable

from agents.base.subagent import SubAgent
from context.memory.api.memory_api_client import MemoryApiClient
from context.memory.core.governance import MemoryGovernance
from context.memory.core.schema import MemoryCandidate, WritebackResult
from context.memory.pipeline.session_memory import SessionMemory
from context.memory.pipeline.writeback import MemoryWriteback
from tools.tool_permission import PermissionConfig

logger = logging.getLogger(__name__)

Extractor = Callable[[str, str], list | Awaitable[list]]


class MemoryWorkerSubAgent(SubAgent):
    """Background memory extraction worker with strict tool permissions."""

    def __init__(
        self,
        api_client: MemoryApiClient,
        governance: MemoryGovernance | None = None,
        llm_extractor: Extractor | None = None,
        poll_interval_sec: float = 5.0,
        batch_size: int = 10,
        max_retries: int = 3,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            name="memory_worker",
            permission_config=PermissionConfig.memory_worker(),
            memory_client=api_client,
            **kwargs,
        )
        self._governance = governance or MemoryGovernance()
        self._writeback = MemoryWriteback(governance=self._governance)
        self._session_memory = SessionMemory(governance=self._governance)
        self._llm_extractor = llm_extractor
        self._poll_interval = max(poll_interval_sec, 1.0)
        self._batch_size = max(batch_size, 1)
        self._max_retries = max(max_retries, 0)
        self._running = False

    async def run_once(self) -> dict[str, Any]:
        """Execute one polling iteration and return processing stats."""
        stats: dict[str, int] = {"fetched": 0, "processed": 0, "done": 0, "failed": 0}
        try:
            tasks = await self.fetch_pending_tasks(limit=self._batch_size)
            stats["fetched"] = len(tasks)
        except Exception as exc:
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
                candidates: list[MemoryCandidate] = await self._writeback.extract_candidates(
                    user_text=user_text,
                    assistant_text=assistant_text,
                    source_turn_id=turn_id,
                    llm_extractor=self._llm_extractor,
                )
                if candidates:
                    write_result: WritebackResult = await self._writeback.flush(
                        api_client=self,
                        user_id=user_id,
                        kb_id=kb_id,
                        candidates=candidates,
                    )
                    logger.debug(
                        "memory_worker_flush_done id=%s session=%s accepted=%d rejected=%d",
                        task_id,
                        session_id,
                        write_result.accepted,
                        write_result.rejected,
                    )

                if session_id and recent_messages and self._session_memory.should_summarize(recent_messages):
                    summary_input = self._session_memory.build_summary_input(recent_messages)
                    await self.save_session_summary(
                        session_id=session_id,
                        summary=summary_input,
                    )

                await self.mark_task_done(task_id)
                stats["done"] += 1
                logger.debug(
                    "memory_worker_task_done id=%s session=%s candidates=%d",
                    task_id,
                    session_id,
                    len(candidates),
                )
            except Exception as exc:
                error_text = str(exc)
                logger.warning(
                    "memory_worker_task_failed id=%s session=%s err=%s",
                    task_id,
                    session_id,
                    exc,
                )
                try:
                    await self.mark_task_failed(task_id, error_text)
                except PermissionError:
                    # Fallback: ensure task is marked failed when permission is misconfigured.
                    try:
                        if self._memory_client is not None:
                            await self._memory_client.mark_task_failed(task_id, error_text)
                    except Exception:
                        pass
                except Exception:
                    pass
                stats["failed"] += 1

        return stats

    async def run(self) -> None:
        """Run polling loop continuously until stopped."""
        self._running = True
        logger.info(
            "memory_worker_start name=%s interval=%.1fs batch=%d",
            self._name,
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
                        "memory_worker_batch name=%s fetched=%d processed=%d done=%d failed=%d",
                        self._name,
                        stats["fetched"],
                        stats["processed"],
                        stats["done"],
                        stats["failed"],
                    )
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("memory_worker_loop_error name=%s err=%s", self._name, exc)
                await asyncio.sleep(self._poll_interval)

        logger.info("memory_worker_stop name=%s", self._name)

    async def stop(self) -> None:
        """Stop worker loop."""
        self._running = False