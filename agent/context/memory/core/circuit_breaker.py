from __future__ import annotations

import asyncio
import logging
import time
from enum import Enum
from typing import Awaitable, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """熔断器，支持异步并发和半开状态流量控制

    特性：
    - 状态自动转换：CLOSED -> OPEN -> HALF_OPEN -> CLOSED
    - 半开状态流量限制：避免恢复时瞬间涌入大量请求
    - 指数退避：OPEN 状态持续时间随失败次数增长
    - 线程安全：适合 asyncio 多协程并发
    """

    def __init__(
        self,
        failure_threshold: int = 3,
        recovery_timeout: float = 30.0,
        half_open_attempts: int = 2,
        half_open_max_concurrent: int = 1,
        max_recovery_timeout: float = 300.0,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout
        self._half_open_attempts = half_open_attempts
        self._half_open_max_concurrent = half_open_max_concurrent
        self._max_recovery_timeout = max_recovery_timeout

        self._failure_count = 0
        self._last_failure_time: float | None = None
        self._state = CircuitState.CLOSED
        self._half_open_success = 0

        # 🚀 优化1: 半开状态的并发控制
        self._half_open_semaphore: asyncio.Semaphore | None = None

        # 🚀 优化2: 保护状态变更的锁
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    async def _try_transition_to_half_open(self) -> bool:
        """尝试转换到半开状态，返回是否转换成功"""
        if self._state != CircuitState.OPEN:
            return self._state == CircuitState.HALF_OPEN

        async with self._lock:
            # 双重检查
            if self._state != CircuitState.OPEN:
                return self._state == CircuitState.HALF_OPEN

            # 🚀 优化3: 指数退避，根据失败次数延长 OPEN 时间
            failure_penalty = min(self._failure_count - self._failure_threshold, 10)
            adjusted_timeout = self._recovery_timeout * (2 ** failure_penalty)
            adjusted_timeout = min(adjusted_timeout, self._max_recovery_timeout)

            if self._last_failure_time is None:
                return False

            if time.monotonic() - self._last_failure_time < adjusted_timeout:
                return False

            self._state = CircuitState.HALF_OPEN
            self._half_open_success = 0
            self._half_open_semaphore = asyncio.Semaphore(self._half_open_max_concurrent)
            logger.info(
                "Circuit breaker HALF_OPEN (recovery_timeout=%.1f, adjusted=%.1f)",
                self._recovery_timeout,
                adjusted_timeout,
            )
            return True

    async def record_success(self) -> None:
        async with self._lock:
            self._failure_count = 0
            if self._state == CircuitState.HALF_OPEN:
                self._half_open_success += 1
                if self._half_open_success >= self._half_open_attempts:
                    self._state = CircuitState.CLOSED
                    self._half_open_semaphore = None
                    logger.info("Circuit breaker CLOSED (recovered)")

    async def record_failure(self) -> None:
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.monotonic()
            if self._state == CircuitState.HALF_OPEN:
                # 半开状态失败，立即切回 OPEN
                self._state = CircuitState.OPEN
                self._half_open_semaphore = None
                logger.warning(
                    "Circuit breaker OPEN (half-open failure, attempts=%d)",
                    self._half_open_success,
                )
            elif self._failure_count >= self._failure_threshold and self._state == CircuitState.CLOSED:
                self._state = CircuitState.OPEN
                logger.warning(
                    "Circuit breaker OPEN (threshold=%d, failures=%d)",
                    self._failure_threshold,
                    self._failure_count,
                )

    async def reset(self) -> None:
        async with self._lock:
            self._failure_count = 0
            self._state = CircuitState.CLOSED
            self._half_open_success = 0
            self._last_failure_time = None
            self._half_open_semaphore = None

    async def call(self, func: Callable[[], Awaitable[T]]) -> T | None:
        # 检查 OPEN 状态，尝试转换到 HALF_OPEN
        if self._state == CircuitState.OPEN:
            if not await self._try_transition_to_half_open():
                logger.debug("Circuit breaker OPEN, skipping call")
                return None

        # 🚀 优化4: 半开状态的并发限制
        if self._state == CircuitState.HALF_OPEN and self._half_open_semaphore is not None:
            async with self._half_open_semaphore:
                return await self._execute_call(func)
        else:
            return await self._execute_call(func)

    async def _execute_call(self, func: Callable[[], Awaitable[T]]) -> T | None:
        try:
            result = await func()
            await self.record_success()
            return result
        except Exception:
            await self.record_failure()
            raise