from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _read_bool(name: str, default: str = "") -> bool:
    raw = os.getenv(name, default).strip().lower()
    return raw in {"1", "true", "yes", "on"}


def _read_int(name: str, default: str, *, minimum: int, maximum: int | None = None) -> int:
    raw = os.getenv(name, default).strip()
    try:
        value = int(raw)
    except ValueError:
        value = int(default)
    value = max(value, minimum)
    if maximum is not None:
        value = min(value, maximum)
    return value


def _read_path(name: str, default: Path) -> str:
    raw = os.getenv(name, "").strip()
    return raw or str(default)


def _read_enabled_tools() -> set[str] | None:
    raw = os.getenv("ENABLED_TOOLS", "").strip()
    if not raw:
        return None
    names = {name.strip() for name in raw.split(",") if name.strip()}
    return names or None


@dataclass(frozen=True)
class ChatStreamRuntimeConfig:
    debug_stream: bool
    enable_tool_use: bool
    use_langgraph: bool
    enabled_tools: set[str] | None
    feature_action_scoring: bool
    feature_failure_memory_inject: bool
    action_score_threshold: int
    tool_explorer_max_steps: int
    failure_memory_dir: str
    context_snip_enabled: bool
    context_collapse_enabled: bool
    context_micro_enabled: bool
    context_auto_enabled: bool
    context_snip_keep_last: int
    context_collapse_keep_last: int
    context_micro_replace_before_rounds: int
    context_auto_trigger_tokens: int
    context_auto_keep_last: int
    context_transcript_dir: str

    @classmethod
    def from_env(cls) -> "ChatStreamRuntimeConfig":
        return cls(
            debug_stream=_read_bool("DEBUG_STREAM"),
            enable_tool_use=_read_bool("ENABLE_TOOL_USE", "true"),
            use_langgraph=_read_bool("USE_LANGGRAPH", "true"),
            enabled_tools=_read_enabled_tools(),
            feature_action_scoring=_read_bool("FEATURE_ACTION_SCORING", "true"),
            feature_failure_memory_inject=_read_bool("FEATURE_FAILURE_MEMORY_INJECT", "true"),
            action_score_threshold=_read_int("ACTION_SCORE_THRESHOLD", "70", minimum=0, maximum=100),
            tool_explorer_max_steps=_read_int("TOOL_EXPLORER_MAX_STEPS", "2", minimum=1, maximum=5),
            failure_memory_dir=_read_path("FAILURE_MEMORY_DIR", Path("runtime") / "failure_memory"),
            context_snip_enabled=_read_bool("FEATURE_CONTEXT_SNIP", "true"),
            context_collapse_enabled=_read_bool("FEATURE_CONTEXT_COLLAPSE", "true"),
            context_micro_enabled=_read_bool("FEATURE_CONTEXT_MICROCOMPACT", "true"),
            context_auto_enabled=_read_bool("FEATURE_CONTEXT_AUTOCOMPACT", "true"),
            context_snip_keep_last=_read_int("CONTEXT_SNIP_KEEP_LAST", "12", minimum=1),
            context_collapse_keep_last=_read_int("CONTEXT_COLLAPSE_KEEP_LAST", "8", minimum=1),
            context_micro_replace_before_rounds=_read_int(
                "CONTEXT_MICRO_REPLACE_BEFORE_ROUNDS",
                "3",
                minimum=1,
            ),
            context_auto_trigger_tokens=_read_int("CONTEXT_AUTO_TRIGGER_TOKENS", "70000", minimum=1),
            context_auto_keep_last=_read_int("CONTEXT_AUTO_KEEP_LAST", "4", minimum=1),
            context_transcript_dir=_read_path("CONTEXT_TRANSCRIPT_DIR", Path("runtime") / "transcripts"),
        )
