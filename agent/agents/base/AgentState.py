from __future__ import annotations

from enum import Enum


class AgentState(Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
