export const GRAPH_NODE_NAMES = [
  "select_skill",
  "load_memory",
  "decide_tool",
  "generate",
  "flush_memory",
  "finalize"
] as const;

export type GraphNodeName = (typeof GRAPH_NODE_NAMES)[number];
