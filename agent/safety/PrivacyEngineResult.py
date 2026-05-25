from __future__ import annotations

from typing import Protocol

from safety.PrivacySpan import PrivacySpan


class PrivacyEngineResult(Protocol):
    redacted_text: str
    detected_spans: list[PrivacySpan]
