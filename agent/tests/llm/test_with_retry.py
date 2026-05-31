from __future__ import annotations

import logging

import pytest

from llm.with_retry import call_with_retry, classify_llm_error, is_retryable_llm_error, retry_delay_seconds


class StatusError(Exception):
    def __init__(self, status_code: int) -> None:
        super().__init__(str(status_code))
        self.status_code = status_code


class Response:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


class ResponseStatusError(Exception):
    def __init__(self, status_code: int) -> None:
        super().__init__(str(status_code))
        self.response = Response(status_code)


@pytest.mark.parametrize(
    ("exc", "kind", "retryable"),
    [
        (StatusError(429), "rate_limited", True),
        (StatusError(500), "server_error", True),
        (StatusError(503), "server_error", True),
        (StatusError(401), "auth_error", False),
        (StatusError(403), "permission_error", False),
        (StatusError(400), "client_error", False),
        (ResponseStatusError(502), "server_error", True),
        (TimeoutError(), "timeout", True),
        (RuntimeError("boom"), "unknown", False),
    ],
)
def test_classify_llm_error(exc: BaseException, kind: str, retryable: bool):
    assert classify_llm_error(exc) == kind
    assert is_retryable_llm_error(exc) is retryable


def test_retry_delay_seconds_caps_delay():
    assert retry_delay_seconds(1) == 0.5
    assert retry_delay_seconds(2) == 1.0
    assert retry_delay_seconds(10) == 4.0


@pytest.mark.asyncio
async def test_call_with_retry_returns_on_first_success(monkeypatch):
    calls = 0

    async def operation():
        nonlocal calls
        calls += 1
        return "ok"

    async def fail_sleep(delay: float):
        raise AssertionError("sleep should not be called")

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fail_sleep)

    result = await call_with_retry(operation, max_retries=2, operation_name="test", logger=logging.getLogger(__name__))

    assert result == "ok"
    assert calls == 1


@pytest.mark.asyncio
async def test_call_with_retry_succeeds_after_retry(monkeypatch):
    calls = 0
    delays = []

    async def operation():
        nonlocal calls
        calls += 1
        if calls == 1:
            raise StatusError(429)
        return "ok"

    async def fake_sleep(delay: float):
        delays.append(delay)

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fake_sleep)

    result = await call_with_retry(operation, max_retries=2, operation_name="test", logger=logging.getLogger(__name__))

    assert result == "ok"
    assert calls == 2
    assert delays == [0.5]


@pytest.mark.asyncio
async def test_call_with_retry_raises_last_error_after_exhaustion(monkeypatch):
    calls = 0

    async def operation():
        nonlocal calls
        calls += 1
        raise StatusError(500)

    async def fake_sleep(delay: float):
        return None

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fake_sleep)

    with pytest.raises(StatusError) as exc_info:
        await call_with_retry(operation, max_retries=2, operation_name="test", logger=logging.getLogger(__name__))

    assert exc_info.value.status_code == 500
    assert calls == 3


@pytest.mark.asyncio
async def test_call_with_retry_does_not_retry_client_error(monkeypatch):
    calls = 0

    async def operation():
        nonlocal calls
        calls += 1
        raise StatusError(401)

    async def fail_sleep(delay: float):
        raise AssertionError("sleep should not be called")

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fail_sleep)

    with pytest.raises(StatusError):
        await call_with_retry(operation, max_retries=2, operation_name="test", logger=logging.getLogger(__name__))

    assert calls == 1


@pytest.mark.asyncio
async def test_call_with_retry_respects_zero_retries(monkeypatch):
    calls = 0

    async def operation():
        nonlocal calls
        calls += 1
        raise StatusError(429)

    async def fail_sleep(delay: float):
        raise AssertionError("sleep should not be called")

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fail_sleep)

    with pytest.raises(StatusError):
        await call_with_retry(operation, max_retries=0, operation_name="test", logger=logging.getLogger(__name__))

    assert calls == 1
