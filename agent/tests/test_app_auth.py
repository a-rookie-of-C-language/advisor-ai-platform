from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app as app_module
from llm import provider_factory


class _FakeChatService:
    async def stream_events(self, messages, user_id=None, session_id=None, kb_id=None):
        _ = messages
        _ = user_id
        _ = session_id
        _ = kb_id
        yield 'event: start\ndata: {"message":"stream_started"}\n\n'
        yield 'event: done\ndata: {"message":"stream_finished"}\n\n'

    def get_graph_health(self):
        return {"use_langgraph": True, "graph": {"compiled": True}}


def test_chat_stream_requires_token_when_configured(monkeypatch):
    monkeypatch.setenv("AGENT_API_TOKEN", "test-token")
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _FakeChatService())
    client = TestClient(app_module.create_api_app())

    response = client.post(
        "/chat/stream",
        json={"messages": [{"role": "user", "content": "hi"}], "userId": 1, "sessionId": 1001, "kbId": 1},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid agent token"


def test_chat_stream_accepts_bearer_token_when_configured(monkeypatch):
    monkeypatch.setenv("AGENT_API_TOKEN", "test-token")
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _FakeChatService())
    client = TestClient(app_module.create_api_app())

    response = client.post(
        "/chat/stream",
        json={"messages": [{"role": "user", "content": "hi"}], "userId": 1, "sessionId": 1001, "kbId": 1},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 200


def test_chat_stream_accepts_x_agent_token_when_configured(monkeypatch):
    monkeypatch.setenv("AGENT_API_TOKEN", "test-token")
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _FakeChatService())
    client = TestClient(app_module.create_api_app())

    response = client.post(
        "/chat/stream",
        json={"messages": [{"role": "user", "content": "hi"}], "userId": 1, "sessionId": 1001, "kbId": 1},
        headers={"X-Agent-Token": "test-token"},
    )
    assert response.status_code == 200


def test_chat_stream_no_token_required_when_not_configured(monkeypatch):
    monkeypatch.delenv("AGENT_API_TOKEN", raising=False)
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _FakeChatService())
    client = TestClient(app_module.create_api_app())

    response = client.post(
        "/chat/stream",
        json={"messages": [{"role": "user", "content": "hi"}], "userId": 1, "sessionId": 1001, "kbId": 1},
    )
    assert response.status_code == 200


def test_graph_health_endpoint(monkeypatch):
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _FakeChatService())
    client = TestClient(app_module.create_api_app())

    response = client.get("/graph/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["graph_health"]["use_langgraph"] is True


def test_app_lifespan_closes_rag_service(monkeypatch):
    class _FakeRagService:
        def __init__(self):
            self.closed = False

        def close(self):
            self.closed = True

    fake_rag = _FakeRagService()
    monkeypatch.setattr(app_module, "_get_rag_service", lambda: fake_rag)
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _FakeChatService())

    with TestClient(app_module.create_api_app()) as client:
        response = client.get("/health")
        assert response.status_code == 200

    assert fake_rag.closed is True


def test_run_api_requires_agent_token(monkeypatch):
    monkeypatch.delenv("AGENT_API_TOKEN", raising=False)

    with pytest.raises(RuntimeError, match="AGENT_API_TOKEN is required"):
        app_module.run_api()


@pytest.mark.asyncio
async def test_run_all_requires_agent_token(monkeypatch):
    monkeypatch.delenv("AGENT_API_TOKEN", raising=False)

    with pytest.raises(RuntimeError, match="AGENT_API_TOKEN is required"):
        await app_module._run_all_async()


def test_build_provider_from_env_falls_back_on_invalid_float(monkeypatch):
    captured: dict[str, float | str | None] = {}

    class _FakeProvider:
        def __init__(self, api_key, model, base_url=None, temperature=0.2, timeout=60.0):
            captured["api_key"] = api_key
            captured["model"] = model
            captured["base_url"] = base_url
            captured["temperature"] = temperature
            captured["timeout"] = timeout

    monkeypatch.setenv("OPENAI_API_KEY", "k")
    monkeypatch.setenv("OPENAI_MODEL", "m")
    monkeypatch.setenv("OPENAI_TEMPERATURE", "bad-temp")
    monkeypatch.setenv("OPENAI_TIMEOUT_SEC", "bad-timeout")
    monkeypatch.setattr(provider_factory, "OpenAIProvider", _FakeProvider)

    provider_factory.build_provider_from_env()

    assert captured["temperature"] == 0.2
    assert captured["timeout"] == 60.0
