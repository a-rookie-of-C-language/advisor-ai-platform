from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.search.schema import WebSearchResult
from agents.search.web_search_subagent import WebSearchSubAgent
from tools.tool_result import ToolResult


@pytest.fixture
def mock_provider():
    provider = MagicMock()
    return provider


@pytest.fixture
def mock_web_search_tool():
    tool = MagicMock()
    return tool


@pytest.fixture
def subagent(mock_provider, mock_web_search_tool):
    return WebSearchSubAgent(
        llm_provider=mock_provider,
        web_search_tool=mock_web_search_tool,
    )


class TestWebSearchSubAgent:
    @pytest.mark.asyncio
    async def test_search_returns_empty_when_no_results(self, subagent):
        with patch.object(
            subagent, "_execute_search", new_callable=AsyncMock
        ) as mock_exec:
            mock_exec.return_value = ToolResult(ok=True, status="miss", message="miss", items=[])

            result = await subagent.search("test query")

            assert isinstance(result, WebSearchResult)
            assert result.summary == "未找到相关搜索结果"
            assert result.sources == []
            assert result.safe is True

    @pytest.mark.asyncio
    async def test_search_returns_empty_when_tool_fails(self, subagent):
        with patch.object(
            subagent, "_execute_search", new_callable=AsyncMock
        ) as mock_exec:
            mock_exec.return_value = ToolResult(
                ok=False, status="error", message="network error", items=[]
            )

            result = await subagent.search("test query")

            assert result.summary == "未找到相关搜索结果"
            assert result.safe is True

    @pytest.mark.asyncio
    async def test_search_returns_summary_when_safe(self, subagent):
        search_items = [
            {"title": "Result 1", "url": "https://example.com/1", "snippet": "First result"},
            {"title": "Result 2", "url": "https://example.com/2", "snippet": "Second result"},
        ]
        judge_response = {
            "summary": "搜索结果总结：两个相关结果",
            "safe": True,
            "filtered_reason": None,
            "key_facts": ["事实1", "事实2"],
        }

        with patch.object(
            subagent, "_execute_search", new_callable=AsyncMock
        ) as mock_exec, patch.object(
            subagent, "_judge", new_callable=AsyncMock
        ) as mock_judge:
            mock_exec.return_value = ToolResult(
                ok=True, status="hit", message="hit", items=search_items
            )
            mock_judge.return_value = judge_response

            result = await subagent.search("test query")

            assert result.summary == "搜索结果总结：两个相关结果"
            assert result.sources == search_items
            assert result.safe is True
            assert result.filtered_reason is None
            assert result.key_facts == ["事实1", "事实2"]

    @pytest.mark.asyncio
    async def test_search_filters_unsafe_content(self, subagent):
        search_items = [
            {"title": "Bad Result", "url": "https://bad.com", "snippet": "Dangerous content"},
        ]
        judge_response = {
            "summary": "包含违规内容",
            "safe": False,
            "filtered_reason": "包含暴力内容",
            "key_facts": [],
        }

        with patch.object(
            subagent, "_execute_search", new_callable=AsyncMock
        ) as mock_exec, patch.object(
            subagent, "_judge", new_callable=AsyncMock
        ) as mock_judge:
            mock_exec.return_value = ToolResult(
                ok=True, status="hit", message="hit", items=search_items
            )
            mock_judge.return_value = judge_response

            result = await subagent.search("dangerous query")

            assert result.safe is False
            assert result.filtered_reason == "包含暴力内容"
            assert result.sources == search_items

    @pytest.mark.asyncio
    async def test_judge_fallback_on_error(self, subagent):
        search_items = [
            {"title": "Result", "url": "https://example.com", "snippet": "Normal content"},
        ]

        with patch.object(
            subagent, "_execute_search", new_callable=AsyncMock
        ) as mock_exec, patch.object(
            subagent, "call_llm_json", new_callable=AsyncMock
        ) as mock_llm:
            mock_exec.return_value = ToolResult(
                ok=True, status="hit", message="hit", items=search_items
            )
            mock_llm.side_effect = RuntimeError("LLM failed")

            result = await subagent.search("test query")

            assert result.safe is True
            assert "Result" in result.summary

    @pytest.mark.asyncio
    async def test_search_passes_max_results(self, subagent):
        with patch.object(
            subagent, "_execute_search", new_callable=AsyncMock
        ) as mock_exec:
            mock_exec.return_value = ToolResult(ok=True, status="miss", message="miss", items=[])

            await subagent.search("query", max_results=10)

            mock_exec.assert_called_once_with("query", 10)
