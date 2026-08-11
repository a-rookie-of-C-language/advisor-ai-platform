from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Awaitable, Callable

from json_types import JsonObject
from llm.openai_stream_recovery import (
    MAX_TRUNCATION_RECOVERY_ATTEMPTS,
    TRUNCATION_RECOVERY_MESSAGE,
)
from llm.with_retry import StreamIdleError, is_retryable_llm_error, retry_delay_seconds


async def stream_plain_chat(
    completion_create: Callable[..., Awaitable[Any]],
    *,
    kwargs: JsonObject,
    payload: list[JsonObject],
    model: str,
    max_retries: int,
    stream_timeout_sec: float,
    stream_idle_timeout_sec: float,
    on_reasoning: Callable[[str], Awaitable[None]] | None,
    logger: logging.Logger,
) -> AsyncIterator[str]:
    max_tokens_bumped = False
    recovery_attempts = 0

    while True:
        attempt = 0
        while True:
            yielded = False
            finish_reason: str | None = None
            try:
                stream = await asyncio.wait_for(
                    completion_create(**kwargs),
                    timeout=stream_timeout_sec,
                )
                stream_iter = stream.__aiter__()
                while True:
                    try:
                        chunk = await asyncio.wait_for(
                            stream_iter.__anext__(),
                            timeout=stream_idle_timeout_sec,
                        )
                    except StopAsyncIteration:
                        break
                    except asyncio.TimeoutError as timeout_exc:
                        raise StreamIdleError(f"流空闲超过 {stream_idle_timeout_sec:.0f} 秒，自动重试") from timeout_exc
                    if chunk.choices:
                        choice = chunk.choices[0]
                        if hasattr(choice, "finish_reason") and choice.finish_reason:
                            finish_reason = choice.finish_reason
                        if hasattr(choice.delta, "reasoning_content"):
                            reasoning = choice.delta.reasoning_content
                            if reasoning and on_reasoning is not None:
                                await on_reasoning(reasoning)
                        delta = choice.delta.content
                        if delta:
                            yielded = True
                            yield delta

                if finish_reason == "length":
                    if not max_tokens_bumped:
                        kwargs["max_tokens"] = 65536
                        max_tokens_bumped = True
                        logger.info(
                            "llm_output_truncated: level=1 bump_max_tokens model=%s",
                            model,
                        )
                        break
                    if recovery_attempts < MAX_TRUNCATION_RECOVERY_ATTEMPTS:
                        recovery_attempts += 1
                        payload.append({"role": "user", "content": TRUNCATION_RECOVERY_MESSAGE})
                        logger.info(
                            "llm_output_truncated: level=2 recovery_attempt=%s/%s model=%s",
                            recovery_attempts,
                            MAX_TRUNCATION_RECOVERY_ATTEMPTS,
                            model,
                        )
                        break
                    logger.warning(
                        "llm_output_truncated: level=3 exhausted model=%s",
                        model,
                    )
                return
            except Exception as exc:
                if yielded or attempt >= max_retries or not is_retryable_llm_error(exc):
                    raise
                attempt += 1
                delay = retry_delay_seconds(attempt)
                logger.warning(
                    "llm_stream_retry: model=%s attempt=%s max_retries=%s delay=%.1f",
                    model,
                    attempt,
                    max_retries,
                    delay,
                )
                await asyncio.sleep(delay)
