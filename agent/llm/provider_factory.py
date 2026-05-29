from __future__ import annotations

import logging

from config.environment import read_bool_env, read_float_env, read_int_env, read_required_env, read_str_env
from llm.base_provider import BaseLLMProvider
from llm.openai_provider import OpenAIProvider
from llm.thinking_config import ThinkingConfig

logger = logging.getLogger(__name__)


def _read_thinking_config() -> ThinkingConfig:
    enabled = read_bool_env("LLM_THINKING_ENABLED", read_bool_env("DEEPSEEK_THINKING_ENABLED", True))
    if not enabled:
        return ThinkingConfig.disabled()
    provider = read_str_env("LLM_THINKING_PROVIDER", "deepseek").lower()
    if provider not in {"deepseek", "openai", "qwen", "none"}:
        logger.warning("Env LLM_THINKING_PROVIDER is invalid, fallback to deepseek")
        provider = "deepseek"
    effort = read_str_env("LLM_REASONING_EFFORT", read_str_env("DEEPSEEK_REASONING_EFFORT", "medium")).lower()
    if effort not in {"low", "medium", "high"}:
        logger.warning("Env LLM_REASONING_EFFORT is invalid, fallback to medium")
        effort = "medium"
    return ThinkingConfig(
        enabled=True,
        provider=provider,
        reasoning_effort=effort,
    )


def build_provider_from_env() -> BaseLLMProvider:
    api_key = read_required_env("OPENAI_API_KEY")
    model = read_required_env("OPENAI_MODEL")
    base_url = read_required_env("OPENAI_BASE_URL")
    temperature = read_float_env("OPENAI_TEMPERATURE", 0.2)
    timeout = read_float_env("OPENAI_TIMEOUT_SEC", 60.0)
    max_retries = read_int_env("OPENAI_MAX_RETRIES", 0)
    stream_timeout_sec = read_float_env("OPENAI_STREAM_TIMEOUT_SEC", 45.0)
    tool_round_timeout_sec = read_float_env("OPENAI_TOOL_ROUND_TIMEOUT_SEC", 30.0)
    stream_idle_timeout_sec = read_float_env("OPENAI_STREAM_IDLE_TIMEOUT_SEC", 90.0)
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
