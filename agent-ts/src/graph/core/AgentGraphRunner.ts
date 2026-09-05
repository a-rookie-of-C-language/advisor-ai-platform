import type { GraphNodeName } from "../model/GraphNodeName.js";
import { GRAPH_NODE_NAMES } from "../model/GraphNodeName.js";
import type { GraphState } from "../model/GraphState.js";
import type { SkillRegistry } from "../../skills/core/SkillRegistry.js";
import { buildSkillSelectionPrompt, parseSkillNames } from "../helpers.js";

export type GraphNodeHandler = (state: GraphState, signal?: AbortSignal) => Promise<GraphState>;

export interface GraphRunEvent {
  readonly node: GraphNodeName;
  readonly status: "start" | "end";
}

export class AgentGraphRunner {
  constructor(
    private readonly handlers: Partial<Record<GraphNodeName, GraphNodeHandler>> = {},
    private readonly skillRegistry?: SkillRegistry,
    private readonly skillSelector?: (prompt: string) => Promise<string>
  ) {}

  async run(initial: GraphState, signal?: AbortSignal, onEvent?: (event: GraphRunEvent) => void): Promise<GraphState> {
    let state = initial;
    for (const node of GRAPH_NODE_NAMES) {
      if (signal?.aborted) throw new Error("graph run aborted");
      onEvent?.({ node, status: "start" });
      if (node === "select_skill" && this.skillRegistry) {
        const userQuery = String(state.userQuery ?? "").trim();
        const allSkills = this.skillRegistry.listAll();
        const knownNames = allSkills.map((skill) => skill.name);
        const catalogPrompt = this.skillRegistry.catalogPrompt();
        const selectionPrompt = buildSkillSelectionPrompt(catalogPrompt, userQuery);
        const selectedNames = this.skillSelector
          ? await this.selectSkills(selectionPrompt, knownNames)
          : [];
        const selected = allSkills.filter((skill) => selectedNames.includes(skill.name));
        state = {
          ...state,
          skillSelectionPrompt: selectionPrompt,
          activeSkills: selected.map((skill) => skill.name),
          skillSystemPrompt: this.skillRegistry.briefPrompt(selected.map((skill) => skill.name))
        };
      }
      state = await (this.handlers[node]?.(state, signal) ?? Promise.resolve(state));
      onEvent?.({ node, status: "end" });
    }
    return state;
  }

  private async selectSkills(prompt: string, knownNames: readonly string[]): Promise<string[]> {
    try {
      const responseText = await this.skillSelector?.(prompt);
      return responseText ? parseSkillNames(responseText, knownNames) : [];
    } catch {
      return [];
    }
  }
}
