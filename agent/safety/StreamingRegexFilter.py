from __future__ import annotations

from safety.RegexFilter import RegexFilter

# 尾部缓冲区长度，防止 chunk 边界截断敏感信息。
_TAIL_BUFFER_LEN = 20


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

        redacted = self._filter.redact(combined)
        output_len = len(combined) - _TAIL_BUFFER_LEN
        output = redacted[:output_len]
        self._tail_buffer = combined[output_len:]
        return output

    def flush(self) -> str:
        """输出缓冲区剩余内容，流结束时调用。"""
        remaining = self._tail_buffer
        self._tail_buffer = ""
        return self._filter.redact(remaining)
