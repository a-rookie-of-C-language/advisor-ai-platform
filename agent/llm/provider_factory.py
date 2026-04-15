from __future__ import annotations

import os

from llm.base_provider import BaseLLMProvider
from llm.openai_provider import OpenAIProvider


def _read_required_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise RuntimeError(f"Missing required env: {name}")
    return value.strip()


def build_provider_from_env() -> BaseLLMProvider:
    api_key = _read_required_env("api_key")
    model = _read_required_env("model_id")
    base_url = os.getenv("base_url", "").strip() or None
    temperature = float(os.getenv("temperature", "0.2"))
    timeout = float(os.getenv("timeout", "60"))
    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
        timeout=timeout,
    )
