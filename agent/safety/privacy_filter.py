from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PrivacySpan:
    label: str
    start: int
    end: int
    text: str
    placeholder: str


@dataclass
class PrivacyResult:
    original: str
    redacted: str
    spans: list[PrivacySpan]
    has_sensitive: bool


class PrivacyFilterWrapper:
    """OpenAI Privacy Filter 封装：延迟加载，本地推理。

    依赖 opf 包（pip install opf），需要 PyTorch。
    如果 opf 未安装，降级为 no-op（pass-through）。
    """

    def __init__(
        self,
        *,
        device: str = "cpu",
        model_path: str | None = None,
        enabled: bool = True,
    ) -> None:
        self._device = device
        self._model_path = model_path
        self._enabled = enabled
        self._opf: Any = None
        self._loaded = False

    def _ensure_loaded(self) -> bool:
        if self._loaded:
            return self._opf is not None
        self._loaded = True
        if not self._enabled:
            return False
        try:
            from opf import OPF

            kwargs: dict[str, Any] = {
                "device": self._device,
                "output_text_only": False,
            }
            if self._model_path:
                kwargs["model"] = self._model_path
            self._opf = OPF(**kwargs)
            logger.info("PrivacyFilter loaded: device=%s", self._device)
            return True
        except ImportError:
            logger.warning("opf package not installed, PrivacyFilter disabled")
            return False
        except Exception:
            logger.warning("PrivacyFilter load failed, falling back to no-op", exc_info=True)
            return False

    def redact(self, text: str) -> PrivacyResult:
        """检测并替换敏感信息。"""
        if not self._ensure_loaded():
            return PrivacyResult(
                original=text,
                redacted=text,
                spans=[],
                has_sensitive=False,
            )

        try:
            result = self._opf.redact(text)
            spans = [
                PrivacySpan(
                    label=s.label,
                    start=s.start,
                    end=s.end,
                    text=s.text,
                    placeholder=s.placeholder,
                )
                for s in result.detected_spans
            ]
            return PrivacyResult(
                original=text,
                redacted=result.redacted_text,
                spans=spans,
                has_sensitive=len(spans) > 0,
            )
        except Exception:
            logger.warning("PrivacyFilter inference failed, returning original text", exc_info=True)
            return PrivacyResult(
                original=text,
                redacted=text,
                spans=[],
                has_sensitive=False,
            )
