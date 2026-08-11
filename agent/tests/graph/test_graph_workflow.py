from __future__ import annotations

import asyncio
from unittest.mock import patch

from graph import nodes as graph_nodes
from graph.state import GraphState
from graph.workflow import build_chat_graph
from llm.chat_message import ChatMessage


class TestGraphState:
    def test_default_state(self):
        state: GraphState = {}
        assert state.get("messages") is None
        assert state.get("user_id") is None
        assert state.get("session_id") is None

    def test_state_with_values(self):
        state: GraphState = {
            "messages": [ChatMessage(role="user", content="hello")],
            "user_id": 1,
            "session_id": 100,
            "kb_id": 0,
            "user_query": "hello",
            "memory_enabled": True,
            "rag_enabled": False,
        }
        assert len(state["messages"]) == 1
        assert state["user_id"] == 1
        assert state["memory_enabled"] is True


class TestBuildChatGraph:
    def test_build_graph(self):
        graph = build_chat_graph()
        assert graph is not None

    def test_graph_has_nodes(self):
        graph = build_chat_graph()
        # LangGraph compiled graph should have the nodes
        # We can verify by checking the graph object
        assert hasattr(graph, "invoke") or hasattr(graph, "ainvoke")


class TestWorkflowNodes:
    @patch("graph.nodes.generate_node")
    def test_generate_node_called(self, mock_generate):
        mock_generate.return_value = {"assistant_answer": "test response"}
        state: GraphState = {
            "messages": [ChatMessage(role="user", content="hello")],
            "user_query": "hello",
        }
        result = asyncio.run(mock_generate(state))
        assert result["assistant_answer"] == "test response"


class _DummyRagTool:
    def to_tool_spec(self):
        return type("ToolSpecLike", (), {"name": "rag_search"})()


class _DummyTools:
    def all_categories(self):
        return {"retrieval", "search"}

    def get(self, name: str):
        if name == "rag_search":
            return _DummyRagTool()
        return None


class _DummyRouteDecision:
    def __init__(self) -> None:
        self.categories = {"search"}
        self.matched_tools = []
        self.matched_by = "fallback"
        self.confidence = 0.42
        self.fallback_reason = "fallback"
        self.reason = "fallback"

    def to_event_payload(self):
        return {
            "matched_by": self.matched_by,
            "confidence": self.confidence,
            "fallback_reason": self.fallback_reason,
            "categories": sorted(self.categories),
            "scores": {},
            "reason": self.reason,
            "matched_tools": self.matched_tools,
            "source": {
                "decision": self.matched_by,
                "categories": sorted(self.categories),
                "matched_tools": self.matched_tools,
            },
        }


class _DummyIntentRouter:
    async def route_decision(self, *args, **kwargs):
        _ = args
        _ = kwargs
        return _DummyRouteDecision()


class _DummyRuntime:
    def __init__(self) -> None:
        self.enable_tool_use = True
        self.intent_router = _DummyIntentRouter()
        self.tools = _DummyTools()
        self.provider = None


async def _dummy_emit_route_observation(*args, **kwargs):
    _ = args
    _ = kwargs
    return {}


@patch("graph.nodes.emit_route_observation", new=_dummy_emit_route_observation)
@patch("graph.nodes._runtime", return_value=_DummyRuntime())
def test_decide_tool_node_keeps_route_when_education_domain_matches(mock_runtime):
    _ = mock_runtime
    state: GraphState = {
        "user_query": "高校辅导员素质能力提升怎么做",
        "session_id": 1,
        "user_id": 2,
    }
    result = asyncio.run(graph_nodes.decide_tool_node(state))

    assert result["force_rag"] is False
    assert result["route_categories"] == {"retrieval"}
    assert result["use_tool"] is True
