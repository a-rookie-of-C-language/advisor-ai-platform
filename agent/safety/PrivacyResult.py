from __future__ import annotations

from dataclasses import dataclass

from safety.PrivacySpan import PrivacySpan


@dataclass
class PrivacyResult:
    original: str
    redacted: str
    spans: list[PrivacySpan]
    has_sensitive: bool
