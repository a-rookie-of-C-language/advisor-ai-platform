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
    provider_name = os.getenv("LLM_PROVIDER", "openai").strip().lower()

    if provider_name != "openai":
        raise RuntimeError(f"Unsupported LLM_PROVIDER: {provider_name}")

    api_key = _read_required_env("OPENAI_API_KEY")
    model = _read_required_env("OPENAI_MODEL")
    base_url = os.getenv("OPENAI_BASE_URL", "").strip() or None

    temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))
    timeout = float(os.getenv("OPENAI_TIMEOUT_SEC", "60"))

    return OpenAIProvider(
        api_key=api_key,
        model=model,
        base_url=base_url,
        temperature=temperature,
        timeout=timeout,
    )
