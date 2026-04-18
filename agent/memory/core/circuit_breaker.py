from __future__ import annotations

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
    def __init__(
        self,
        failure_threshold: int = 3,
        recovery_timeout: float = 30.0,
        half_open_attempts: int = 1,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout
        self._half_open_attempts = half_open_attempts
        self._failure_count = 0
        self._last_failure_time: float | None = None
        self._state = CircuitState.CLOSED
        self._half_open_success = 0

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            assert self._last_failure_time is not None
            if time.monotonic() - self._last_failure_time >= self._recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._half_open_success = 0
                logger.info("Circuit breaker HALF_OPEN (recovering)")
        return self._state

    def record_success(self) -> None:
        self._failure_count = 0
        if self._state == CircuitState.HALF_OPEN:
            self._half_open_success += 1
            if self._half_open_success >= self._half_open_attempts:
                self._state = CircuitState.CLOSED
                logger.info("Circuit breaker CLOSED (recovered)")

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self._failure_count >= self._failure_threshold:
            self._state = CircuitState.OPEN
            logger.warning(
                "Circuit breaker OPEN (threshold=%d, failures=%d)",
                self._failure_threshold,
                self._failure_count,
            )

    def reset(self) -> None:
        self._failure_count = 0
        self._state = CircuitState.CLOSED
        self._half_open_success = 0
        self._last_failure_time = None

    async def call(self, func: Callable[[], Awaitable[T]]) -> T | None:
        if self.state == CircuitState.OPEN:
            logger.warning("Circuit breaker OPEN, skipping call")
            return None
        try:
            result = await func()
            self.record_success()
            return result
        except Exception:
            self.record_failure()
            raise
