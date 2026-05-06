from __future__ import annotations

import pytest

from safety.regex_filter import RegexFilter, RegexMatch, StreamingRegexFilter
from safety.safety_pipeline import SafetyPipeline, SafetyResult


class TestRegexFilter:
    def test_no_matches(self):
        f = RegexFilter()
        matches = f.scan("This is a normal text without sensitive data.")
        assert matches == []

    def test_phone_match(self):
        f = RegexFilter()
        matches = f.scan("Call me at 13812345678")
        assert len(matches) > 0
        assert any(m.category == "phone" for m in matches)

    def test_email_match(self):
        f = RegexFilter()
        matches = f.scan("Email me at test@example.com")
        assert len(matches) > 0
        assert any(m.category == "email" for m in matches)

    def test_redact(self):
        f = RegexFilter()
        redacted = f.redact("My phone is 13812345678")
        assert "13812345678" not in redacted
        assert "***" in redacted or "****" in redacted


class TestStreamingRegexFilter:
    def test_process_chunk_no_match(self):
        f = RegexFilter()
        sf = StreamingRegexFilter(f)
        result = sf.process_chunk("Hello World")
        assert result == "Hello World"

    def test_flush(self):
        f = RegexFilter()
        sf = StreamingRegexFilter(f)
        sf.process_chunk("partial")
        remaining = sf.flush()
        assert remaining == "partial"


class TestSafetyPipeline:
    def test_filter_text_clean(self):
        pipeline = SafetyPipeline()
        result = pipeline.filter_text("This is a clean text.")
        assert not result.has_sensitive
        assert result.redacted == "This is a clean text."

    def test_filter_text_with_phone(self):
        pipeline = SafetyPipeline(enable_privacy=False)
        result = pipeline.filter_text("Call 13812345678")
        assert result.has_sensitive
        assert "13812345678" not in result.redacted

    def test_filter_text_with_email(self):
        pipeline = SafetyPipeline(enable_privacy=False)
        result = pipeline.filter_text("Email test@example.com")
        assert result.has_sensitive
        assert "test@example.com" not in result.redacted

    def test_safety_result_properties(self):
        result = SafetyResult(
            original="test",
            redacted="test",
            regex_matches=[],
            privacy_result=None,
        )
        assert not result.has_sensitive

    def test_create_streaming_filter(self):
        pipeline = SafetyPipeline()
        sf = pipeline.create_streaming_filter()
        assert isinstance(sf, StreamingRegexFilter)
