from __future__ import annotations

import logging
import re
from dataclasses import dataclass

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
    re.compile(r"(?:sk|pk)[\-_][a-zA-Z0-9]{20,}"),           # OpenAI style
    re.compile(r"AKIA[A-Z0-9]{16}"),                          # AWS
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),                       # GitHub
    re.compile(r"xoxb-[a-zA-Z0-9\-]+"),                       # Slack
    re.compile(r"(?:password|passwd|pwd|secret|token|api_?key)\s*[:=]\s*\S+", re.IGNORECASE),
]

# 尾部缓冲区长度（防止 chunk 边界截断）
_TAIL_BUFFER_LEN = 20


@dataclass
class RegexMatch:
    label: str
    start: int
    end: int
    matched: str


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
            for m in pattern.finditer(text):
                matches.append(RegexMatch(
                    label=label,
                    start=m.start(),
                    end=m.end(),
                    matched=m.group(),
                ))
        return matches

    def redact(self, text: str) -> str:
        """替换所有匹配项为 [MASK:LABEL] 占位符。"""
        matches = self.scan(text)
        if not matches:
            return text
        # 按 start 降序替换，避免偏移错乱
        result = text
        for m in sorted(matches, key=lambda x: x.start, reverse=True):
            result = result[:m.start] + f"[MASK:{m.label.upper()}]" + result[m.end:]
        return result


class StreamingRegexFilter:
    """流式正则过滤器：维护尾部缓冲区处理 chunk 边界截断。"""

    def __init__(self, regex_filter: RegexFilter | None = None) -> None:
        self._filter = regex_filter or RegexFilter()
        self._tail_buffer = ""

    def process_chunk(self, chunk: str) -> str:
        """处理单个 chunk，返回过滤后的文本。"""
        combined = self._tail_buffer + chunk
        if len(combined) <= _TAIL_BUFFER_LEN:
            self._tail_buffer = combined
            return ""

        # 对 combined 做正则替换，但只输出前 (len - TAIL_BUFFER_LEN) 个字符
        redacted = self._filter.redact(combined)
        output_len = len(combined) - _TAIL_BUFFER_LEN
        output = redacted[:output_len]
        self._tail_buffer = combined[output_len:]
        return output

    def flush(self) -> str:
        """输出缓冲区剩余内容（流结束时调用）。"""
        remaining = self._tail_buffer
        self._tail_buffer = ""
        return self._filter.redact(remaining)
