from __future__ import annotations

from dataclasses import dataclass, field

from safety.PrivacyResult import PrivacyResult
from safety.RegexMatch import RegexMatch


@dataclass
class SafetyResult:
    original: str
    redacted: str
    regex_matches: list[RegexMatch] = field(default_factory=list)
    privacy_result: PrivacyResult | None = None

    @property
    def has_sensitive(self) -> bool:
        if self.regex_matches:
            return True
        return self.privacy_result is not None and self.privacy_result.has_sensitive
