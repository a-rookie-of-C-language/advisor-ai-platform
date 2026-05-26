from __future__ import annotations

from fastapi import FastAPI, Request

from app_api_support import require_agent_token
from tools.workspace import WorkspaceManager


def register_workspace_routes(app: FastAPI, workspace_manager_cls=WorkspaceManager) -> None:
    @app.post("/workspace/cleanup")
    async def workspace_cleanup(raw_request: Request, userId: int | None = None, sessionId: int | None = None) -> dict:
        require_agent_token(raw_request)
        manager = workspace_manager_cls()
        result = manager.cleanup_cache(user_id=userId, session_id=sessionId)
        return {"status": "ok", "cleaned": result}

    @app.get("/workspace/stats")
    async def workspace_stats(raw_request: Request, userId: int | None = None, sessionId: int | None = None) -> dict:
        require_agent_token(raw_request)
        manager = workspace_manager_cls()
        stats = manager.get_stats(user_id=userId, session_id=sessionId)
        return {"status": "ok", "stats": stats}
