from __future__ import annotations

import logging
import os

from llm.base_provider import BaseLLMProvider
from llm.openai_provider import OpenAIProvider

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


def build_provider_from_env() -> BaseLLMProvider:
    api_key = _read_required_env("OPENAI_API_KEY")
    model = _read_required_env("OPENAI_MODEL")

    base_url = os.getenv("OPENAI_BASE_URL", "").strip() or None
    temperature = _read_float_env("OPENAI_TEMPERATURE", 0.2)
    timeout = _read_float_env("OPENAI_TIMEOUT_SEC", 60.0)

    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
        timeout=timeout,
    )
