from __future__ import annotations

from dataclasses import dataclass


@dataclass
class PrivacySpan:
    label: str
    start: int
    end: int
    text: str
    placeholder: str
