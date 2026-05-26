from __future__ import annotations

import asyncio
import logging
from typing import Callable

import httpx

from context.memory.api.MemoryApiCircuitOpen import MemoryApiCircuitOpen
from context.memory.core.circuit_breaker import CircuitBreaker
from json_types import JsonObject


async def request_memory_api(
    *,
    method: str,
    path: str,
    base_url: str,
    timeout_sec: float,
    max_retries: int,
    retry_backoff_sec: float,
    bearer_token: str | None,
    circuit_breaker: CircuitBreaker,
    logger: logging.Logger,
    async_client_factory: Callable[..., httpx.AsyncClient],
    json: JsonObject | None = None,
) -> JsonObject:
    url = f"{base_url}{path}"
    headers: dict[str, str] = {}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    async def _do_request() -> JsonObject:
        async with async_client_factory(timeout=timeout_sec) as client:
            response = await client.request(method=method, url=url, json=json, headers=headers)
            response.raise_for_status()
            if not response.content:
                return {"ok": True, "data": None}
            return response.json()

    if circuit_breaker.state.value == "open":
        logger.warning("Memory API circuit open, skipping request: %s %s", method, path)
        raise MemoryApiCircuitOpen(f"Circuit open: {method} {path}")

    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            result = await _do_request()
            circuit_breaker.record_success()
            return result
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            if status_code is not None and 400 <= status_code < 500 and status_code != 429:
                circuit_breaker.record_failure()
                raise
            last_error = exc
            circuit_breaker.record_failure()
        except (httpx.RequestError, ValueError) as exc:
            last_error = exc
            circuit_breaker.record_failure()

        if attempt >= max_retries:
            break
        backoff = retry_backoff_sec * (2 ** attempt)
        logger.warning(
            "Memory API retry %d/%d after %.1fs: %s %s",
            attempt + 1,
            max_retries + 1,
            backoff,
            method,
            path,
        )
        await asyncio.sleep(backoff)

    if last_error is not None:
        raise last_error
    raise RuntimeError("Memory API request failed")
