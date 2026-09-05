import type { GraphNodeName } from "../model/GraphNodeName.js";
import { GRAPH_NODE_NAMES } from "../model/GraphNodeName.js";
import type { GraphState } from "../model/GraphState.js";
import type { SkillRegistry } from "../../skills/core/SkillRegistry.js";

export type GraphNodeHandler = (state: GraphState, signal?: AbortSignal) => Promise<GraphState>;

export interface GraphRunEvent {
  readonly node: GraphNodeName;
  readonly status: "start" | "end";
}

export class AgentGraphRunner {
  constructor(
    private readonly handlers: Partial<Record<GraphNodeName, GraphNodeHandler>> = {},
    private readonly skillRegistry?: SkillRegistry
  ) {}

  async run(initial: GraphState, signal?: AbortSignal, onEvent?: (event: GraphRunEvent) => void): Promise<GraphState> {
    let state = initial;
    for (const node of GRAPH_NODE_NAMES) {
      if (signal?.aborted) throw new Error("graph run aborted");
      onEvent?.({ node, status: "start" });
      if (node === "select_skill" && this.skillRegistry) {
        const userQuery = String(state.userQuery ?? "").trim();
        const selected = this.skillRegistry
          .listAll()
          .filter((skill) => userQuery.length > 0 && (skill.description.includes(userQuery) || skill.brief.includes(userQuery)));
        state = {
          ...state,
          activeSkills: selected.map((skill) => skill.name),
          skillSystemPrompt: this.skillRegistry.briefPrompt(selected.map((skill) => skill.name))
        };
      }
      state = await (this.handlers[node]?.(state, signal) ?? Promise.resolve(state));
      onEvent?.({ node, status: "end" });
    }
    return state;
  }
}
