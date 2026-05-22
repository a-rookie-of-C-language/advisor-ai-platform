from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from json_types import JsonObject

ThinkingProvider = Literal["deepseek", "openai", "qwen"]
ReasoningEffort = Literal["low", "medium", "high"]


@dataclass(frozen=True)
class ThinkingConfig:
    """统一管理不同模型厂商的思考模式参数。"""

    enabled: bool = True
    provider: ThinkingProvider | None = None
    reasoning_effort: ReasoningEffort = "medium"
    extra_body: JsonObject = field(default_factory=dict)

    @classmethod
    def disabled(cls) -> "ThinkingConfig":
        return cls(enabled=False)

    def to_request_kwargs(self) -> JsonObject:
        """转换为 OpenAI-compatible API 请求参数。"""
        if not self.enabled or self.provider is None:
            return {}

        if self.provider == "deepseek":
            extra_body = {"thinking": {"type": "enabled"}}
            extra_body.update(self.extra_body)
            return {
                "reasoning_effort": self.reasoning_effort,
                "extra_body": extra_body,
            }

        if self.provider == "openai":
            return {"reasoning_effort": self.reasoning_effort}

        if self.provider == "qwen":
            extra_body = {"enable_thinking": True}
            extra_body.update(self.extra_body)
            return {"extra_body": extra_body}

        return {}
