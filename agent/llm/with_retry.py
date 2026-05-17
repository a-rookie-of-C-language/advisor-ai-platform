from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import TypeVar

from openai import APIConnectionError, APITimeoutError, AuthenticationError, PermissionDeniedError, RateLimitError

T = TypeVar("T")

_RETRYABLE_ERROR_KINDS = {"timeout", "network_error", "rate_limited", "server_error", "overloaded", "stream_idle"}


class StreamIdleError(Exception):
    """流空闲超时：LLM 流超过配置时间无数据产出。"""

    def __init__(self, message: str = "Stream idle timeout") -> None:
        super().__init__(message)


def _status_code(exc: BaseException) -> int | None:
    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code
    response = getattr(exc, "response", None)
    response_status_code = getattr(response, "status_code", None)
    if isinstance(response_status_code, int):
        return response_status_code
    return None


def classify_llm_error(exc: BaseException) -> str:
    status_code = _status_code(exc)
    if isinstance(exc, (TimeoutError, APITimeoutError)):
        return "timeout"
    if isinstance(exc, StreamIdleError):
        return "stream_idle"
    if isinstance(exc, APIConnectionError):
        return "network_error"
    if isinstance(exc, AuthenticationError) or status_code == 401:
        return "auth_error"
    if isinstance(exc, PermissionDeniedError) or status_code == 403:
        return "permission_error"
    if isinstance(exc, RateLimitError) or status_code == 429:
        return "rate_limited"
    if status_code == 529:
        return "overloaded"
    if status_code is not None:
        if 500 <= status_code < 600:
            return "server_error"
        if 400 <= status_code < 500:
            return "client_error"
    # ECONNRESET / EPIPE / ConnectionError 也归类为 network_error
    if isinstance(exc, ConnectionError):
        return "network_error"
    return "unknown"


def is_retryable_llm_error(exc: BaseException) -> bool:
    return classify_llm_error(exc) in _RETRYABLE_ERROR_KINDS


def is_overloaded_error(exc: BaseException) -> bool:
    """判断是否为过载错误（529），用于后台任务立即放弃。"""
    return classify_llm_error(exc) == "overloaded"


def retry_delay_seconds(attempt: int) -> float:
    return min(0.5 * (2 ** max(0, attempt - 1)), 4.0)


async def call_with_retry(
    operation: Callable[[], Awaitable[T]],
    *,
    max_retries: int,
    operation_name: str,
    logger: logging.Logger,
) -> T:
    retries = max(0, max_retries)
    attempt = 0
    while True:
        try:
            return await operation()
        except Exception as exc:
            if attempt >= retries or not is_retryable_llm_error(exc):
                raise
            attempt += 1
            delay = retry_delay_seconds(attempt)
            logger.warning(
                "llm_retry: operation=%s attempt=%s max_retries=%s kind=%s delay=%.1f",
                operation_name,
                attempt,
                retries,
                classify_llm_error(exc),
                delay,
            )
            await asyncio.sleep(delay)
