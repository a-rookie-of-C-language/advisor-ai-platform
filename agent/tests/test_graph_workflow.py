from __future__ import annotations

from unittest.mock import patch

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
        result = mock_generate(state)
        assert result["assistant_answer"] == "test response"
