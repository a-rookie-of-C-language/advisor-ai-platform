from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from .nodes import (
    decide_tool_node,
    finalize_node,
    flush_memory_node,
    generate_node,
    load_memory_node,
)
from .state import GraphState


def build_chat_graph():
    graph = StateGraph(GraphState)
    graph.add_node("load_memory", load_memory_node)
    graph.add_node("decide_tool", decide_tool_node)
    graph.add_node("generate", generate_node)
    graph.add_node("flush_memory", flush_memory_node)
    graph.add_node("finalize", finalize_node)

    graph.add_edge(START, "load_memory")
    graph.add_edge("load_memory", "decide_tool")
    graph.add_edge("decide_tool", "generate")
    graph.add_edge("generate", "flush_memory")
    graph.add_edge("flush_memory", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()
