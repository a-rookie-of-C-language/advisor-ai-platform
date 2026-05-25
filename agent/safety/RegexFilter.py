from __future__ import annotations

import logging
import re

from safety.RegexMatch import RegexMatch

logger = logging.getLogger(__name__)

# 中国手机号：1[3-9]开头的11位数字
_PHONE_RE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")

# 身份证号：18位，最后一位可以是X
_IDCARD_RE = re.compile(r"(?<!\d)[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)")

# 银行卡号：16-19位数字
_BANKCARD_RE = re.compile(r"(?<!\d)[1-9]\d{15,18}(?!\d)")

# 邮箱
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# API Key / Secret
_SECRET_PATTERNS = [
    re.compile(r"(?:sk|pk)[\-_][a-zA-Z0-9]{20,}"),  # OpenAI style
    re.compile(r"AKIA[A-Z0-9]{16}"),  # AWS
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),  # GitHub
    re.compile(r"xoxb-[a-zA-Z0-9\-]+"),  # Slack
    re.compile(r"(?:password|passwd|pwd|secret|token|api_?key)\s*[:=]\s*\S+", re.IGNORECASE),
]


class RegexFilter:
    """正则粗筛层：快速匹配结构化敏感信息。"""

    def __init__(self, custom_patterns: dict[str, str] | None = None) -> None:
        self._patterns: list[tuple[str, re.Pattern[str]]] = [
            ("phone", _PHONE_RE),
            ("idcard", _IDCARD_RE),
            ("bankcard", _BANKCARD_RE),
            ("email", _EMAIL_RE),
        ]
        for sp in _SECRET_PATTERNS:
            self._patterns.append(("secret", sp))
        if custom_patterns:
            for name, pattern in custom_patterns.items():
                try:
                    self._patterns.append((f"custom:{name}", re.compile(pattern)))
                except re.error:
                    logger.warning("Invalid custom pattern: %s", name)

    def scan(self, text: str) -> list[RegexMatch]:
        """扫描文本，返回所有匹配项。"""
        matches: list[RegexMatch] = []
        for label, pattern in self._patterns:
            for match in pattern.finditer(text):
                matches.append(
                    RegexMatch(
                        label=label,
                        start=match.start(),
                        end=match.end(),
                        matched=match.group(),
                    )
                )
        return matches

    def redact(self, text: str) -> str:
        """替换所有匹配项为 [MASK:LABEL] 占位符。"""
        matches = self.scan(text)
        if not matches:
            return text

        result = text
        for match in sorted(matches, key=lambda item: item.start, reverse=True):
            result = result[: match.start] + f"[MASK:{match.label.upper()}]" + result[match.end :]
        return result
