from chat.stream_runtime_config import ChatStreamRuntimeConfig


def test_runtime_config_uses_defaults(monkeypatch):
    for key in (
        "DEBUG_STREAM",
        "ENABLE_TOOL_USE",
        "USE_LANGGRAPH",
        "ENABLED_TOOLS",
        "ACTION_SCORE_THRESHOLD",
        "TOOL_EXPLORER_MAX_STEPS",
        "FAILURE_MEMORY_DIR",
        "CONTEXT_TRANSCRIPT_DIR",
    ):
        monkeypatch.delenv(key, raising=False)

    config = ChatStreamRuntimeConfig.from_env()

    assert config.debug_stream is False
    assert config.enable_tool_use is True
    assert config.use_langgraph is True
    assert config.enabled_tools is None
    assert config.action_score_threshold == 70
    assert config.tool_explorer_max_steps == 2
    assert config.failure_memory_dir.endswith("runtime\\failure_memory") or config.failure_memory_dir.endswith(
        "runtime/failure_memory"
    )


def test_runtime_config_clamps_and_parses_env(monkeypatch):
    monkeypatch.setenv("DEBUG_STREAM", "yes")
    monkeypatch.setenv("ENABLE_TOOL_USE", "false")
    monkeypatch.setenv("ENABLED_TOOLS", "rag_search, memory_read, ,workspace_read")
    monkeypatch.setenv("ACTION_SCORE_THRESHOLD", "150")
    monkeypatch.setenv("TOOL_EXPLORER_MAX_STEPS", "0")
    monkeypatch.setenv("CONTEXT_SNIP_KEEP_LAST", "bad")
    monkeypatch.setenv("CONTEXT_TRANSCRIPT_DIR", "custom/transcripts")

    config = ChatStreamRuntimeConfig.from_env()

    assert config.debug_stream is True
    assert config.enable_tool_use is False
    assert config.enabled_tools == {"rag_search", "memory_read", "workspace_read"}
    assert config.action_score_threshold == 100
    assert config.tool_explorer_max_steps == 1
    assert config.context_snip_keep_last == 12
    assert config.context_transcript_dir == "custom/transcripts"
