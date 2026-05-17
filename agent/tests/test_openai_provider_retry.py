from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from llm.chat_message import ChatMessage
from llm.openai_provider import OpenAIProvider
from llm.tool_spec import ToolSpec


class StatusError(Exception):
    def __init__(self, status_code: int) -> None:
        super().__init__(str(status_code))
        self.status_code = status_code


class FakeCompletions:
    def __init__(self, results: list[Any]) -> None:
        self.results = results
        self.calls: list[dict[str, Any]] = []

    async def create(self, **kwargs: Any):
        self.calls.append(kwargs)
        result = self.results.pop(0)
        if isinstance(result, BaseException):
            raise result
        return result


class FakeClient:
    def __init__(self, completions: FakeCompletions) -> None:
        self.chat = SimpleNamespace(completions=completions)


def make_provider(results: list[Any], *, max_retries: int = 0) -> tuple[OpenAIProvider, FakeCompletions]:
    completions = FakeCompletions(results)
    provider = OpenAIProvider(
        api_key="test-key",
        model="test-model",
        base_url="http://example.test/v1",
        max_retries=max_retries,
    )
    provider._client = FakeClient(completions)  # type: ignore[assignment]
    return provider, completions


def chunk(text: str):
    return SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=text))])


async def stream_chunks(*texts: str):
    for text in texts:
        yield chunk(text)


async def failing_stream_after_first_delta():
    yield chunk("hello")
    raise StatusError(500)


async def failing_stream_before_delta():
    raise StatusError(500)
    yield chunk("unreachable")


def tool_response(content: str):
    message = SimpleNamespace(content=content, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def sample_tool() -> ToolSpec:
    return ToolSpec(
        name="search",
        description="Search docs",
        parameters={
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    )


@pytest.mark.asyncio
async def test_stream_chat_yields_chunks():
    provider, completions = make_provider([stream_chunks("hello", " world")])
    messages = [ChatMessage(role="user", content="hi")]

    chunks = [chunk async for chunk in provider.stream_chat(messages)]

    assert chunks == ["hello", " world"]
    assert len(completions.calls) == 1
    assert completions.calls[0]["stream"] is True


@pytest.mark.asyncio
async def test_stream_chat_retries_create_error(monkeypatch):
    delays = []

    async def fake_sleep(delay: float):
        delays.append(delay)

    monkeypatch.setattr("llm.openai_provider.asyncio.sleep", fake_sleep)
    provider, completions = make_provider([StatusError(429), stream_chunks("ok")], max_retries=1)
    messages = [ChatMessage(role="user", content="hi")]

    chunks = [chunk async for chunk in provider.stream_chat(messages)]

    assert chunks == ["ok"]
    assert len(completions.calls) == 2
    assert delays == [0.5]


@pytest.mark.asyncio
async def test_stream_chat_does_not_retry_auth_error(monkeypatch):
    async def fail_sleep(delay: float):
        raise AssertionError("sleep should not be called")

    monkeypatch.setattr("llm.openai_provider.asyncio.sleep", fail_sleep)
    provider, completions = make_provider([StatusError(401)], max_retries=2)
    messages = [ChatMessage(role="user", content="hi")]

    with pytest.raises(StatusError):
        _ = [chunk async for chunk in provider.stream_chat(messages)]

    assert len(completions.calls) == 1


@pytest.mark.asyncio
async def test_stream_chat_retries_timeout(monkeypatch):
    async def fake_sleep(delay: float):
        return None

    monkeypatch.setattr("llm.openai_provider.asyncio.sleep", fake_sleep)
    provider, completions = make_provider([TimeoutError(), stream_chunks("ok")], max_retries=1)
    messages = [ChatMessage(role="user", content="hi")]

    chunks = [chunk async for chunk in provider.stream_chat(messages)]

    assert chunks == ["ok"]
    assert len(completions.calls) == 2


@pytest.mark.asyncio
async def test_stream_chat_retries_iteration_error_before_delta(monkeypatch):
    async def fake_sleep(delay: float):
        return None

    monkeypatch.setattr("llm.openai_provider.asyncio.sleep", fake_sleep)
    provider, completions = make_provider([failing_stream_before_delta(), stream_chunks("ok")], max_retries=1)
    messages = [ChatMessage(role="user", content="hi")]

    chunks = [chunk async for chunk in provider.stream_chat(messages)]

    assert chunks == ["ok"]
    assert len(completions.calls) == 2


@pytest.mark.asyncio
async def test_stream_chat_does_not_retry_after_delta(monkeypatch):
    async def fail_sleep(delay: float):
        raise AssertionError("sleep should not be called")

    monkeypatch.setattr("llm.openai_provider.asyncio.sleep", fail_sleep)
    provider, completions = make_provider(
        [failing_stream_after_first_delta(), stream_chunks("duplicate")],
        max_retries=1,
    )
    messages = [ChatMessage(role="user", content="hi")]
    chunks = []

    with pytest.raises(StatusError):
        async for text in provider.stream_chat(messages):
            chunks.append(text)

    assert chunks == ["hello"]
    assert len(completions.calls) == 1


@pytest.mark.asyncio
async def test_stream_chat_with_tools_without_tools_reuses_stream_chat():
    provider, completions = make_provider([stream_chunks("hello")])
    messages = [ChatMessage(role="user", content="hi")]

    events = [event async for event in provider.stream_chat_with_tools(messages, [], None)]

    assert [event.type for event in events] == ["delta"]
    assert events[0].text == "hello"
    assert len(completions.calls) == 1
    assert completions.calls[0]["stream"] is True


@pytest.mark.asyncio
async def test_stream_chat_with_tools_retries_llm_call(monkeypatch):
    delays = []

    async def fake_sleep(delay: float):
        delays.append(delay)

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fake_sleep)
    provider, completions = make_provider([StatusError(503), tool_response("tool answer")], max_retries=1)
    messages = [ChatMessage(role="user", content="hi")]

    async def tool_executor(tool_name: str, tool_args: dict[str, Any]) -> str:
        return "unused"

    events = [
        event
        async for event in provider.stream_chat_with_tools(messages, [sample_tool()], tool_executor)
    ]

    assert [event.text for event in events] == ["tool answer"]
    assert len(completions.calls) == 2
    assert completions.calls[0]["stream"] is False
    assert delays == [0.5]


@pytest.mark.asyncio
async def test_stream_chat_with_tools_does_not_retry_auth_error(monkeypatch):
    async def fail_sleep(delay: float):
        raise AssertionError("sleep should not be called")

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fail_sleep)
    provider, completions = make_provider([StatusError(401)], max_retries=2)
    messages = [ChatMessage(role="user", content="hi")]

    async def tool_executor(tool_name: str, tool_args: dict[str, Any]) -> str:
        return "unused"

    with pytest.raises(StatusError):
        _ = [
            event
            async for event in provider.stream_chat_with_tools(messages, [sample_tool()], tool_executor)
        ]

    assert len(completions.calls) == 1


@pytest.mark.asyncio
async def test_stream_chat_with_tools_llm_retry_does_not_retry_tool_executor(monkeypatch):
    async def fake_sleep(delay: float):
        return None

    monkeypatch.setattr("llm.with_retry.asyncio.sleep", fake_sleep)
    tool_call = SimpleNamespace(
        id="call-1",
        function=SimpleNamespace(name="search", arguments='{"query":"advisor"}'),
    )
    tool_message = SimpleNamespace(content="", tool_calls=[tool_call])
    tool_call_response = SimpleNamespace(choices=[SimpleNamespace(message=tool_message)])
    provider, completions = make_provider([StatusError(503), tool_call_response, tool_response("final")], max_retries=1)
    messages = [ChatMessage(role="user", content="hi")]
    tool_calls = 0

    async def tool_executor(tool_name: str, tool_args: dict[str, Any]) -> str:
        nonlocal tool_calls
        tool_calls += 1
        raise RuntimeError("tool failed")

    events = [
        event
        async for event in provider.stream_chat_with_tools(
            messages,
            [sample_tool()],
            tool_executor,
            max_tool_calls=1,
            max_tool_retries=1,
        )
    ]

    assert tool_calls == 1
    assert len(completions.calls) == 3
    assert [event.type for event in events] == ["tool_call", "tool_result", "delta"]
    assert events[1].success is False
    assert events[2].text == "final"
