from __future__ import annotations

from app_api_support import build_stream_kwargs


class _Request:
    userId = 7
    sessionId = 9


class _TraceAwareService:
    def stream_events(self, messages, *, trace_id=None, turn_id=None):
        yield messages, trace_id, turn_id


class _LegacyService:
    stream_events = 1


def test_build_stream_kwargs_includes_trace_context_for_supported_service():
    kwargs = build_stream_kwargs(
        service=_TraceAwareService(),
        request=_Request(),
        trace_id="trace-1",
        turn_id="turn-1",
    )

    assert kwargs == {
        "user_id": 7,
        "session_id": 9,
        "trace_id": "trace-1",
        "turn_id": "turn-1",
    }


def test_build_stream_kwargs_keeps_base_kwargs_when_signature_is_unavailable():
    kwargs = build_stream_kwargs(
        service=_LegacyService(),
        request=_Request(),
        trace_id="trace-1",
        turn_id="turn-1",
    )

    assert kwargs == {
        "user_id": 7,
        "session_id": 9,
    }
