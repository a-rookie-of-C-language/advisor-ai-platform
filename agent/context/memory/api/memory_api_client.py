from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

import httpx
from context.memory.core.circuit_breaker import CircuitBreaker
from context.memory.core.schema import MemoryCandidate, MemoryItem, SessionSummary, WritebackResult

logger = logging.getLogger(__name__)


class MemoryApiClient:
    def __init__(
        self,
        base_url: str,
        timeout_sec: float = 8.0,
        max_retries: int = 3,
        retry_backoff_sec: float = 0.5,
        bearer_token: str | None = None,
        failure_threshold: int = 3,
        recovery_timeout: float = 60.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_sec = timeout_sec
        self._max_retries = max_retries
        self._retry_backoff_sec = retry_backoff_sec
        self._bearer_token = bearer_token
        self._circuit_breaker = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
        )
        self._logger = logger

    async def search_long_term(
        self,
        user_id: int,
        kb_id: int,
        query: str,
        top_k: int,
    ) -> list[MemoryItem]:
        payload = {
            "userId": user_id,
            "kbId": kb_id,
            "query": query,
            "topK": top_k,
        }
        data = await self._request("POST", "/api/memory/long-term/search", json=payload)
        raw_items = data.get("data", [])
        return [self._to_memory_item(item) for item in raw_items]

    async def upsert_candidates(
        self,
        user_id: int,
        kb_id: int,
        candidates: list[MemoryCandidate],
    ) -> WritebackResult:
        payload = {
            "userId": user_id,
            "kbId": kb_id,
            "candidates": [
                {
                    "content": c.content,
                    "confidence": c.confidence,
                    "sourceTurnId": c.source_turn_id,
                    "tags": c.tags,
                }
                for c in candidates
            ],
        }
        data = await self._request("POST", "/api/memory/long-term/candidates", json=payload)
        body = data.get("data", {})
        return WritebackResult(
            accepted=int(body.get("accepted", 0)),
            rejected=int(body.get("rejected", 0)),
            message=str(body.get("message", "ok")),
        )

    async def get_session_summary(self, session_id: int) -> SessionSummary | None:
        try:
            data = await self._request("GET", f"/api/memory/session-summary/{session_id}")
        except httpx.HTTPStatusError as exc:
            if exc.response is not None and exc.response.status_code == 404:
                return None
            raise

        body = data.get("data")
        if not body:
            return None
        return SessionSummary(
            session_id=int(body.get("sessionId", session_id)),
            summary=str(body.get("summary", "")),
            updated_at=self._parse_datetime(body.get("updatedAt")),
        )

    async def save_session_summary(self, session_id: int, summary: str) -> None:
        payload = {"summary": summary}
        await self._request("PUT", f"/api/memory/session-summary/{session_id}", json=payload)

    async def health(self) -> bool:
        try:
            data = await self._request("GET", "/api/memory/health")
            return bool(data.get("ok", True))
        except Exception:
            return False

    async def submit_memory_task(
        self,
        user_id: int,
        kb_id: int,
        session_id: int,
        turn_id: str,
        user_text: str | None = None,
        assistant_text: str | None = None,
        recent_messages: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "userId": user_id,
            "kbId": kb_id,
            "sessionId": session_id,
            "turnId": turn_id,
        }
        if user_text is not None:
            payload["userText"] = user_text
        if assistant_text is not None:
            payload["assistantText"] = assistant_text
        if recent_messages is not None:
            payload["recentMessages"] = recent_messages
        data = await self._request("POST", "/api/memory/task/submit", json=payload)
        return data.get("data", {})

    async def fetch_pending_tasks(self, limit: int = 10) -> list[dict[str, Any]]:
        data = await self._request("GET", f"/api/memory/task/pending?limit={limit}")
        return data.get("data", [])

    async def mark_task_done(self, task_id: int) -> None:
        await self._request("POST", f"/api/memory/task/{task_id}/done")

    async def mark_task_failed(self, task_id: int, error: str | None = None) -> None:
        params: dict[str, Any] = {}
        if error:
            params["error"] = error
        await self._request("POST", f"/api/memory/task/{task_id}/fail", json=params if params else None)

    async def _request(self, method: str, path: str, json: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        headers: dict[str, str] = {}
        if self._bearer_token:
            headers["Authorization"] = f"Bearer {self._bearer_token}"

        async def _do_request() -> dict[str, Any]:
            async with httpx.AsyncClient(timeout=self._timeout_sec) as client:
                response = await client.request(method=method, url=url, json=json, headers=headers)
                response.raise_for_status()
                if not response.content:
                    return {"ok": True, "data": None}
                return response.json()

        if self._circuit_breaker.state.value == "open":
            self._logger.warning("Memory API circuit open, skipping request: %s %s", method, path)
            raise MemoryApiCircuitOpen(f"Circuit open: {method} {path}")

        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                result = await _do_request()
                self._circuit_breaker.record_success()
                return result
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code if exc.response is not None else None
                if status_code is not None and 400 <= status_code < 500 and status_code != 429:
                    self._circuit_breaker.record_failure()
                    raise
                last_error = exc
                self._circuit_breaker.record_failure()
            except (httpx.RequestError, ValueError) as exc:
                last_error = exc
                self._circuit_breaker.record_failure()

            if attempt >= self._max_retries:
                break
            backoff = self._retry_backoff_sec * (2 ** attempt)
            self._logger.warning(
                "Memory API retry %d/%d after %.1fs: %s %s",
                attempt + 1, self._max_retries + 1, backoff, method, path
            )
            await asyncio.sleep(backoff)

        if last_error is not None:
            raise last_error
        raise RuntimeError("Memory API request failed")


class MemoryApiCircuitOpen(Exception):
    pass

    @staticmethod
    def _to_memory_item(data: dict[str, Any]) -> MemoryItem:
        return MemoryItem(
            id=int(data.get("id", 0)),
            user_id=int(data.get("userId", 0)),
            kb_id=int(data.get("kbId", 0)),
            content=str(data.get("content", "")),
            confidence=float(data.get("confidence", 0.5)),
            score=float(data.get("score", 0.0)),
            created_at=MemoryApiClient._parse_datetime(data.get("createdAt")),
            updated_at=MemoryApiClient._parse_datetime(data.get("updatedAt")),
            expires_at=MemoryApiClient._parse_datetime(data.get("expiresAt")),
            tags=data.get("tags") or {},
        )

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None
