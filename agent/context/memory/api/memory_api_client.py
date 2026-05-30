from __future__ import annotations

import logging
from datetime import datetime

import httpx

from context.memory.api.memory_api_mappers import parse_datetime, to_memory_item, to_session_summary
from context.memory.api.memory_api_transport import request_memory_api
from context.memory.core.circuit_breaker import CircuitBreaker
from context.memory.core.MemoryCandidate import MemoryCandidate
from context.memory.core.MemoryItem import MemoryItem
from context.memory.core.SessionSummary import SessionSummary
from context.memory.core.WritebackResult import WritebackResult
from json_types import JsonObject, JsonValue

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
        type_weights: dict[str, float] | None = None,
    ) -> list[MemoryItem]:
        payload = {
            "userId": user_id,
            "kbId": kb_id,
            "query": query,
            "topK": top_k,
        }
        if type_weights:
            payload["typeWeights"] = type_weights
        data = await self._request("POST", "/api/memory/long-term/search", json=payload)
        raw_items = data.get("data", [])
        return [to_memory_item(item) for item in raw_items]

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
                    "memoryType": c.memory_type,
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
        return to_session_summary(body, session_id)

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
    ) -> JsonObject:
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

    async def fetch_pending_tasks(self, limit: int = 10) -> list[JsonObject]:
        data = await self._request("GET", f"/api/memory/task/pending?limit={limit}")
        return data.get("data", [])

    async def mark_task_done(self, task_id: int) -> None:
        await self._request("POST", f"/api/memory/task/{task_id}/done")

    async def mark_task_failed(self, task_id: int, error: str | None = None) -> None:
        params: JsonObject = {}
        if error:
            params["error"] = error
        await self._request("POST", f"/api/memory/task/{task_id}/fail", json=params if params else None)

    async def invalidate_memory(self, memory_id: int) -> None:
        """Invalidate a memory (soft delete)."""
        await self._request("POST", f"/api/memory/long-term/{memory_id}/invalidate")

    async def update_memory_confidence(self, memory_id: int, confidence: float) -> None:
        """Update confidence of an existing memory."""
        await self._request(
            "POST",
            f"/api/memory/long-term/{memory_id}/confidence",
            json={"confidence": confidence},
        )

    async def update_memory_content(self, memory_id: int, content: str, confidence: float) -> None:
        """Update content and confidence of an existing memory (for merge)."""
        await self._request(
            "POST",
            f"/api/memory/long-term/{memory_id}/content",
            json={"content": content, "confidence": confidence},
        )

    async def _request(self, method: str, path: str, json: JsonObject | None = None) -> JsonObject:
        return await request_memory_api(
            method=method,
            path=path,
            json=json,
            base_url=self._base_url,
            timeout_sec=self._timeout_sec,
            max_retries=self._max_retries,
            retry_backoff_sec=self._retry_backoff_sec,
            bearer_token=self._bearer_token,
            circuit_breaker=self._circuit_breaker,
            logger=self._logger,
            async_client_factory=httpx.AsyncClient,
        )

    @staticmethod
    def _to_memory_item(data: JsonObject) -> MemoryItem:
        return to_memory_item(data)

    @staticmethod
    def _parse_datetime(value: JsonValue) -> datetime | None:
        return parse_datetime(value)
