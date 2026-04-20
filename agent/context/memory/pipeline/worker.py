from __future__ import annotations

import warnings

warnings.warn(
    "memory.pipeline.worker.MemoryWorkerAgent is deprecated, "
    "use agents.MemoryWorkerSubAgent instead",
    DeprecationWarning,
    stacklevel=2,
)

import asyncio
import logging
import time
from typing import Awaitable, Callable

from agent.context.memory.api.memory_api_client import MemoryApiClient
from agent.context.memory.core.governance import MemoryGovernance
from agent.context.memory.pipeline.llm_extractor import OpenAILLMExtractor
from agent.context.memory.pipeline.writeback import MemoryWriteback
from agent.context.memory.pipeline.session_memory import SessionMemory

logger = logging.getLogger(__name__)

Extractor = Callable[[str, str], list | Awaitable[list]]


class MemoryWorkerAgent:
    """后台记忆提取Worker
    
    能力约束（Claude Code模式）：
    - 只能：读取对话上下文 + 写入记忆 + 生成会话摘要
    - 不能：调用工具、搜索、执行任何其他操作
    
    工作流程：
    1. 轮询拉取 pending 状态的任务（按created_at ASC，FIFO）
    2. 拉取时自动标记为 processing（防止多Worker重复消费）
    3. 对每个任务执行：规则提取 → LLM提取(可选) → 治理过滤 → 写入后端
    4. 标记任务完成/失败
    5. 判断是否需要生成会话摘要
    """

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
                    await self._api_client.save_session_summary(
                        session_id=session_id, summary=summary_input
                    )

                await self._api_client.mark_task_done(task_id)
                stats["done"] += 1
                logger.debug(
                    "memory_worker_task_done id=%s session=%s candidates=%d",
                    task_id, session_id, len(candidates),
                )
            except Exception as exc:
                logger.warning(
                    "memory_worker_task_failed id=%s session=%s err=%s",
                    task_id, session_id, exc,
                )
                try:
                    await self._api_client.mark_task_failed(task_id, str(exc))
                except Exception:
                    pass
                stats["failed"] += 1

        return stats

    async def run(self) -> None:
        self._running = True
        logger.info(
            "memory_worker_start interval=%.1fs batch=%d",
            self._poll_interval, self._batch_size,
        )
        while self._running:
            try:
                stats = await self.run_once()
                if stats["fetched"] == 0:
                    await asyncio.sleep(self._poll_interval)
                else:
                    logger.info(
                        "memory_worker_batch fetched=%d processed=%d done=%d failed=%d",
                        stats["fetched"], stats["processed"],
                        stats["done"], stats["failed"],
                    )
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("memory_worker_loop_error err=%s", exc)
                await asyncio.sleep(self._poll_interval)

        logger.info("memory_worker_stop")

    def stop(self) -> None:
        self._running = False
