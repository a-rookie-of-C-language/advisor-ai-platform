import type { GraphNodeName } from "../model/GraphNodeName.js";
import { GRAPH_NODE_NAMES } from "../model/GraphNodeName.js";
import type { GraphState } from "../model/GraphState.js";

export type GraphNodeHandler = (state: GraphState, signal?: AbortSignal) => Promise<GraphState>;

export interface GraphRunEvent {
  readonly node: GraphNodeName;
  readonly status: "start" | "end";
}

export class AgentGraphRunner {
  constructor(private readonly handlers: Partial<Record<GraphNodeName, GraphNodeHandler>> = {}) {}

  async run(initial: GraphState, signal?: AbortSignal, onEvent?: (event: GraphRunEvent) => void): Promise<GraphState> {
    let state = initial;
    for (const node of GRAPH_NODE_NAMES) {
      if (signal?.aborted) throw new Error("graph run aborted");
      onEvent?.({ node, status: "start" });
      state = await (this.handlers[node]?.(state, signal) ?? Promise.resolve(state));
      onEvent?.({ node, status: "end" });
    }
    return state;
  }
}
