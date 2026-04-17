from __future__ import annotations

from fastapi.testclient import TestClient

import app as app_module


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
