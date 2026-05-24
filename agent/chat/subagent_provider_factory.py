from __future__ import annotations

import logging
import os

from llm.base_provider import BaseLLMProvider

logger = logging.getLogger(__name__)


class SubagentProviderFactory:
    def __init__(self, provider: BaseLLMProvider) -> None:
        self._provider = provider

    def build(
        self,
        *,
        env_prefix: str,
        default_model: str | None = None,
        temperature_default: float = 0.0,
        timeout_default: float = 30.0,
        max_retries_default: int = 0,
        stream_timeout_default: float = 30.0,
        tool_round_timeout_default: float = 20.0,
        stream_idle_timeout_default: float = 45.0,
    ) -> BaseLLMProvider:
        env_model = os.getenv(f"{env_prefix}_MODEL", "").strip()
        model = env_model or default_model or ""
        if not model:
            return self._provider
        if env_model:
            api_key = os.getenv(f"{env_prefix}_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
            base_url = os.getenv(f"{env_prefix}_BASE_URL", "").strip() or os.getenv("OPENAI_BASE_URL", "").strip()
            if not api_key or not base_url:
                logger.warning(
                    "%s_MODEL configured but api key/base url missing, fallback to main provider",
                    env_prefix,
                )
                return self._provider
            try:
                from llm.openai_provider import OpenAIProvider
                from llm.provider_factory import _read_float_env, _read_int_env
                from llm.thinking_config import ThinkingConfig

                return OpenAIProvider(
                    api_key=api_key,
                    model=model,
                    base_url=base_url,
                    temperature=_read_float_env(f"{env_prefix}_TEMPERATURE", temperature_default),
                    timeout=_read_float_env(f"{env_prefix}_TIMEOUT_SEC", timeout_default),
                    max_retries=_read_int_env(f"{env_prefix}_MAX_RETRIES", max_retries_default),
                    stream_timeout_sec=_read_float_env(f"{env_prefix}_STREAM_TIMEOUT_SEC", stream_timeout_default),
                    tool_round_timeout_sec=_read_float_env(
                        f"{env_prefix}_TOOL_ROUND_TIMEOUT_SEC",
                        tool_round_timeout_default,
                    ),
                    stream_idle_timeout_sec=_read_float_env(
                        f"{env_prefix}_STREAM_IDLE_TIMEOUT_SEC",
                        stream_idle_timeout_default,
                    ),
                    thinking_config=ThinkingConfig.disabled(),
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to build %s provider, fallback to main provider: %s",
                    env_prefix.lower(),
                    exc,
                )
                return self._provider

        try:
            return self._provider.with_model(model)
        except NotImplementedError:
            logger.warning(
                "%s_DEFAULT_MODEL configured but provider does not support model override, fallback to main provider",
                env_prefix,
            )
            return self._provider
