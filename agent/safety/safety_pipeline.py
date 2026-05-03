from __future__ import annotations

import logging
from dataclasses import dataclass, field

from safety.privacy_filter import PrivacyFilterWrapper, PrivacyResult
from safety.regex_filter import RegexFilter, RegexMatch, StreamingRegexFilter

logger = logging.getLogger(__name__)


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


class SafetyPipeline:
    """两层安全过滤管道：RegexFilter（粗筛）+ PrivacyFilter（精筛）。"""

    def __init__(
        self,
        *,
        regex_filter: RegexFilter | None = None,
        privacy_filter: PrivacyFilterWrapper | None = None,
        enable_regex: bool = True,
        enable_privacy: bool = True,
    ) -> None:
        self._regex = regex_filter or RegexFilter()
        self._privacy = privacy_filter or PrivacyFilterWrapper()
        self._enable_regex = enable_regex
        self._enable_privacy = enable_privacy

    def create_streaming_filter(self) -> StreamingRegexFilter:
        """创建流式正则过滤器实例（用于 generate_node 流式输出）。"""
        return StreamingRegexFilter(self._regex)

    def filter_text(self, text: str) -> SafetyResult:
        """对完整文本执行两层过滤。

        第一层：RegexFilter 正则粗筛（零延迟）
        第二层：PrivacyFilter 模型精筛（需要推理）
        """
        regex_matches: list[RegexMatch] = []
        intermediate = text

        if self._enable_regex:
            regex_matches = self._regex.scan(text)
            if regex_matches:
                logger.info("safety_regex: %d matches found", len(regex_matches))
                intermediate = self._regex.redact(text)

        privacy_result: PrivacyResult | None = None
        if self._enable_privacy:
            privacy_result = self._privacy.redact(intermediate)
            if privacy_result.has_sensitive:
                logger.info(
                    "safety_privacy: %d spans detected",
                    len(privacy_result.spans),
                )

        final = privacy_result.redacted if privacy_result else intermediate
        return SafetyResult(
            original=text,
            redacted=final,
            regex_matches=regex_matches,
            privacy_result=privacy_result,
        )
