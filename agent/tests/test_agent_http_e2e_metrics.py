from __future__ import annotations

import asyncio
import json
import math
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from fastapi.testclient import TestClient

import app as app_module

FIXTURE_DIR = Path(__file__).parent / "fixtures"
REPORT_DIR = Path(__file__).parent / "reports"
REPORT_PATH = REPORT_DIR / "agent_http_e2e_metrics.json"


def _load_json(name: str) -> Any:
    return json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))


def _serialize_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _parse_sse(text: str) -> list[dict[str, Any]]:
    events = []
    for block in text.replace("\r", "").split("\n\n"):
        if not block.strip():
            continue
        event_name = "message"
        payload: dict[str, Any] = {}
        for line in block.split("\n"):
            if line.startswith("event:"):
                event_name = line.split(":", 1)[1].strip()
            if line.startswith("data:"):
                payload = json.loads(line.split(":", 1)[1].strip())
        events.append({"event": event_name, "data": payload})
    return events


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = math.ceil((percentile / 100) * len(ordered)) - 1
    return ordered[max(index, 0)]


def _contains_all_keywords(text: str, keywords: list[str]) -> bool:
    return all(keyword in text for keyword in keywords)


def _quality_score(answer: str, keywords: list[str]) -> float:
    if not keywords:
        return 1.0
    hit_count = sum(1 for keyword in keywords if keyword in answer)
    return hit_count / len(keywords)


def _build_mock_chat_service(cases: list[dict[str, Any]], *, force_error: bool = False) -> SimpleNamespace:
    case_by_message = {case["message"]: case for case in cases}

    async def stream_events(messages, user_id=None, session_id=None, kb_id=None, trace_id=None, turn_id=None):
        _ = user_id
        _ = session_id
        _ = kb_id
        _ = trace_id
        _ = turn_id
        last_message = messages[-1].content if messages else ""
        if force_error:
            yield _serialize_sse("start", {"message": "stream_started"})
            yield _serialize_sse("error", {"message": "mock internal error"})
            yield _serialize_sse("done", {"message": "stream_finished_with_error"})
            return

        case = case_by_message[last_message]
        await asyncio.sleep(case.get("mock_latency_ms", 0) / 1000)
        yield _serialize_sse("start", {"message": "stream_started"})
        yield _serialize_sse("intent", {"name": case["expected_intent"]})
        if case["expected_intent"] == "rag_lookup":
            yield _serialize_sse(
                "sources",
                {
                    "tool": "rag_search",
                    "success": True,
                    "status": "hit",
                    "items": [{"title": "mock source", "content": case["mock_answer"]}],
                },
            )
        yield _serialize_sse("delta", {"text": case["mock_answer"]})
        yield _serialize_sse("done", {"message": "stream_finished"})

    def get_graph_health() -> dict[str, Any]:
        return {
            "use_langgraph": True,
            "graph": {"compiled": True},
            "registered_tools": ["rag_search"],
            "memory_enabled": True,
        }

    return SimpleNamespace(stream_events=stream_events, get_graph_health=get_graph_health)


def _evaluate_case(client: TestClient, case: dict[str, Any], thresholds: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "messages": [{"role": "user", "content": case["message"]}],
        "userId": 1,
        "sessionId": 1001,
        "kbId": 1,
        "traceId": f"trace-{case['case_id']}",
        "turnId": f"turn-{case['case_id']}",
    }
    started_at = time.perf_counter()
    response = client.post("/chat/stream", json=payload, headers={"Authorization": "Bearer test-token"})
    latency_ms = (time.perf_counter() - started_at) * 1000
    events = _parse_sse(response.text)
    answer = "".join(event["data"].get("text", "") for event in events if event["event"] == "delta")
    event_names = [event["event"] for event in events]
    intent_names = [event["data"].get("name") for event in events if event["event"] == "intent"]
    has_error_event = "error" in event_names
    timed_out = latency_ms > thresholds["case_timeout_ms"]
    accurate = response.status_code == 200 and _contains_all_keywords(answer, case["expected_answer_keywords"])
    task_completed = response.status_code == 200 and "done" in event_names and not has_error_event and bool(answer)
    intent_hit = case["expected_intent"] in intent_names
    quality = _quality_score(answer, case["quality_keywords"])
    business_failed = response.status_code == 200 and not accurate

    return {
        "case_id": case["case_id"],
        "status_code": response.status_code,
        "latency_ms": round(latency_ms, 2),
        "event_names": event_names,
        "answer": answer,
        "accuracy_passed": accurate,
        "task_completed": task_completed,
        "intent_hit": intent_hit,
        "quality_score": round(quality, 4),
        "exception_error": response.status_code >= 500 or has_error_event,
        "business_failed": business_failed,
        "timed_out": timed_out,
    }


def _build_metrics(results: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(results)
    latencies = [item["latency_ms"] for item in results]
    return {
        "case_count": total,
        "accuracy": sum(1 for item in results if item["accuracy_passed"]) / total,
        "task_completion_rate": sum(1 for item in results if item["task_completed"]) / total,
        "quality_score": sum(item["quality_score"] for item in results) / total,
        "intent_hit_rate": sum(1 for item in results if item["intent_hit"]) / total,
        "exception_error_rate": sum(1 for item in results if item["exception_error"]) / total,
        "business_failure_rate": sum(1 for item in results if item["business_failed"]) / total,
        "timeout_rate": sum(1 for item in results if item["timed_out"]) / total,
        "p50_latency_ms": _percentile(latencies, 50),
        "p95_latency_ms": _percentile(latencies, 95),
    }


def _assert_thresholds(metrics: dict[str, Any], thresholds: dict[str, Any]) -> dict[str, bool]:
    checks = {
        "accuracy": metrics["accuracy"] >= thresholds["accuracy_min"],
        "task_completion_rate": metrics["task_completion_rate"] >= thresholds["task_completion_rate_min"],
        "quality_score": metrics["quality_score"] >= thresholds["quality_score_min"],
        "intent_hit_rate": metrics["intent_hit_rate"] >= thresholds["intent_hit_rate_min"],
        "exception_error_rate": metrics["exception_error_rate"] <= thresholds["exception_error_rate_max"],
        "business_failure_rate": metrics["business_failure_rate"] <= thresholds["business_failure_rate_max"],
        "timeout_rate": metrics["timeout_rate"] <= thresholds["timeout_rate_max"],
        "p95_latency_ms": metrics["p95_latency_ms"] <= thresholds["p95_latency_ms_max"],
    }
    assert all(checks.values()), {"metrics": metrics, "thresholds": thresholds, "checks": checks}
    return checks


def test_agent_http_e2e_metrics_report_and_thresholds(monkeypatch):
    cases = _load_json("agent_http_e2e_cases.json")
    thresholds = _load_json("agent_http_e2e_thresholds.json")
    monkeypatch.setenv("AGENT_API_TOKEN", "test-token")
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _build_mock_chat_service(cases))
    client = TestClient(app_module.create_api_app())

    health_response = client.get("/health")
    graph_health_response = client.get("/graph/health")
    assert health_response.status_code == 200
    assert graph_health_response.status_code == 200
    assert graph_health_response.json()["graph_health"]["graph"]["compiled"] is True

    results = [_evaluate_case(client, case, thresholds) for case in cases]
    metrics = _build_metrics(results)
    checks = _assert_thresholds(metrics, thresholds)

    REPORT_DIR.mkdir(exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(
            {
                "suite": "agent_http_e2e_mock",
                "metrics": metrics,
                "thresholds": thresholds,
                "checks": checks,
                "cases": results,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    assert REPORT_PATH.exists()


def test_agent_http_e2e_auth_and_validation_errors(monkeypatch):
    cases = _load_json("agent_http_e2e_cases.json")
    monkeypatch.setenv("AGENT_API_TOKEN", "test-token")
    monkeypatch.setattr(app_module, "_get_chat_stream_service", lambda: _build_mock_chat_service(cases))
    client = TestClient(app_module.create_api_app())

    unauthorized = client.post("/chat/stream", json={"messages": [{"role": "user", "content": cases[0]["message"]}]})
    invalid_payload = client.post(
        "/chat/stream",
        json={"messages": [{"role": "user", "content": ""}]},
        headers={"Authorization": "Bearer test-token"},
    )

    assert unauthorized.status_code == 401
    assert invalid_payload.status_code == 422


def test_agent_http_e2e_internal_error_stream_is_countable(monkeypatch):
    cases = _load_json("agent_http_e2e_cases.json")
    monkeypatch.setenv("AGENT_API_TOKEN", "test-token")
    monkeypatch.setattr(
        app_module,
        "_get_chat_stream_service",
        lambda: _build_mock_chat_service(cases, force_error=True),
    )
    client = TestClient(app_module.create_api_app())

    response = client.post(
        "/chat/stream",
        json={"messages": [{"role": "user", "content": cases[0]["message"]}]},
        headers={"Authorization": "Bearer test-token"},
    )
    events = _parse_sse(response.text)
    event_names = [event["event"] for event in events]

    assert response.status_code == 200
    assert event_names == ["start", "error", "done"]
