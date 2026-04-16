from __future__ import annotations

import os

from llm.base_provider import BaseLLMProvider
from llm.openai_provider import OpenAIProvider


def _read_required_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    raise RuntimeError(f"Missing required env. candidates={names}")


def build_provider_from_env() -> BaseLLMProvider:
    api_key = _read_required_env("OPENAI_API_KEY", "api_key")
    model = _read_required_env("OPENAI_MODEL", "model_id")

    base_url = os.getenv("OPENAI_BASE_URL", "").strip() or os.getenv("base_url", "").strip() or None
    temperature = float(os.getenv("OPENAI_TEMPERATURE", os.getenv("temperature", "0.2")))
    timeout = float(os.getenv("OPENAI_TIMEOUT_SEC", os.getenv("timeout", "60")))

    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
        timeout=timeout,
    )
