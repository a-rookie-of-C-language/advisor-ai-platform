from __future__ import annotations

import httpx
import pytest

import agent.context.memory.api.memory_api_client as memory_api_module
from agent.context.memory.api.memory_api_client import MemoryApiClient


class _FakeAsyncClient:
    responses: list[object] = []
    calls: list[dict] = []

    def __init__(self, timeout: float) -> None:
        self.timeout = timeout

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        return False

    async def request(self, method: str, url: str, json=None, headers=None):
        _FakeAsyncClient.calls.append(
            {
                "method": method,
                "url": url,
                "json": json,
                "headers": headers or {},
            }
        )
        current = _FakeAsyncClient.responses.pop(0)
        if isinstance(current, Exception):
            raise current
        return current


@pytest.mark.asyncio
async def test_get_session_summary_returns_none_when_404(monkeypatch: pytest.MonkeyPatch) -> None:
    client = MemoryApiClient(base_url="http://memory.local")

    async def _raise_404(*args, **kwargs):
        request = httpx.Request("GET", "http://memory.local/api/memory/session-summary/1")
        response = httpx.Response(404, request=request, json={"message": "not found"})
        raise httpx.HTTPStatusError("not found", request=request, response=response)

    monkeypatch.setattr(client, "_request", _raise_404)

    summary = await client.get_session_summary(1)
    assert summary is None


@pytest.mark.asyncio
async def test_request_retries_on_500_and_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    client = MemoryApiClient(
        base_url="http://memory.local",
        timeout_sec=1.0,
        max_retries=2,
        retry_backoff_sec=0.0,
        bearer_token="token-123",
    )

    req_500 = httpx.Request("POST", "http://memory.local/api/memory/long-term/search")
    req_200 = httpx.Request("POST", "http://memory.local/api/memory/long-term/search")
    response_500 = httpx.Response(500, request=req_500, json={"message": "server error"})
    response_200 = httpx.Response(200, request=req_200, json={"ok": True, "data": []})

    _FakeAsyncClient.responses = [response_500, response_200]
    _FakeAsyncClient.calls = []

    monkeypatch.setattr(memory_api_module.httpx, "AsyncClient", _FakeAsyncClient)

    data = await client._request(
        "POST",
        "/api/memory/long-term/search",
        json={"userId": 1, "kbId": 0, "query": "q", "topK": 3},
    )

    assert data == {"ok": True, "data": []}
    assert len(_FakeAsyncClient.calls) == 2
    assert _FakeAsyncClient.calls[0]["headers"]["Authorization"] == "Bearer token-123"


@pytest.mark.asyncio
async def test_request_does_not_retry_on_400(monkeypatch: pytest.MonkeyPatch) -> None:
    client = MemoryApiClient(
        base_url="http://memory.local",
        timeout_sec=1.0,
        max_retries=2,
        retry_backoff_sec=0.0,
    )

    req_400 = httpx.Request("GET", "http://memory.local/api/memory/session-summary/1")
    response_400 = httpx.Response(400, request=req_400, json={"message": "bad request"})
    _FakeAsyncClient.responses = [response_400]
    _FakeAsyncClient.calls = []

    monkeypatch.setattr(memory_api_module.httpx, "AsyncClient", _FakeAsyncClient)

    with pytest.raises(httpx.HTTPStatusError):
        await client._request("GET", "/api/memory/session-summary/1")

    assert len(_FakeAsyncClient.calls) == 1

