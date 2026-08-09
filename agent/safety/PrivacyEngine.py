from __future__ import annotations

from typing import Protocol

from safety.PrivacyEngineResult import PrivacyEngineResult


class PrivacyEngine(Protocol):
    def redact(self, text: str) -> PrivacyEngineResult: ...
