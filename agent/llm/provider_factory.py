from __future__ import annotations

import logging
import os

from llm.base_provider import BaseLLMProvider
from llm.openai_provider import OpenAIProvider
from llm.thinking_config import ThinkingConfig

logger = logging.getLogger(__name__)


def _read_required_env(name: str) -> str:
    value = os.getenv(name)
    if value is not None and value.strip():
        return value.strip()
    raise RuntimeError(f"Missing required env: {name}")


def _read_float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %.1f", name, default)
        return default


def _read_int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %s", name, default)
        return default


def _read_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _read_thinking_config() -> ThinkingConfig:
    enabled = _read_bool_env("LLM_THINKING_ENABLED", _read_bool_env("DEEPSEEK_THINKING_ENABLED", True))
    if not enabled:
        return ThinkingConfig.disabled()
    provider = os.getenv("LLM_THINKING_PROVIDER", "deepseek").strip().lower()
    if provider not in {"deepseek", "openai", "qwen", "none"}:
        logger.warning("Env LLM_THINKING_PROVIDER is invalid, fallback to deepseek")
        provider = "deepseek"
    effort = os.getenv("LLM_REASONING_EFFORT", os.getenv("DEEPSEEK_REASONING_EFFORT", "medium")).strip().lower()
    if effort not in {"low", "medium", "high"}:
        logger.warning("Env LLM_REASONING_EFFORT is invalid, fallback to medium")
        effort = "medium"
    return ThinkingConfig(
        enabled=True,
        provider=provider,
        reasoning_effort=effort,
    )


def build_provider_from_env() -> BaseLLMProvider:
    api_key = _read_required_env("OPENAI_API_KEY")
    model = _read_required_env("OPENAI_MODEL")
    base_url = _read_required_env("OPENAI_BASE_URL")
    temperature = _read_float_env("OPENAI_TEMPERATURE", 0.2)
    timeout = _read_float_env("OPENAI_TIMEOUT_SEC", 60.0)
    max_retries = _read_int_env("OPENAI_MAX_RETRIES", 0)
    stream_timeout_sec = _read_float_env("OPENAI_STREAM_TIMEOUT_SEC", 45.0)
    tool_round_timeout_sec = _read_float_env("OPENAI_TOOL_ROUND_TIMEOUT_SEC", 30.0)
    stream_idle_timeout_sec = _read_float_env("OPENAI_STREAM_IDLE_TIMEOUT_SEC", 90.0)
    thinking_config = _read_thinking_config()

    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
        timeout=timeout,
        max_retries=max_retries,
        stream_timeout_sec=stream_timeout_sec,
        tool_round_timeout_sec=tool_round_timeout_sec,
        stream_idle_timeout_sec=stream_idle_timeout_sec,
        thinking_config=thinking_config,
    )
