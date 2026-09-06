import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import { GRAPH_NODE_NAMES } from "../../../graph/model/GraphNodeName.js";

export class AgentGraphHealthDescriptor {
  describe(input: {
    readonly memoryEnabled: boolean;
    readonly contextCompaction: JsonObject;
    readonly graph: JsonObject;
  }): JsonObject {
    return {
      memory_enabled: input.memoryEnabled,
      context_compaction: input.contextCompaction,
      graph: input.graph,
      compiled: true,
      checkpoint: "typescript-runtime",
      nodes: [...GRAPH_NODE_NAMES],
      workflow_nodes: [...GRAPH_NODE_NAMES],
      runtime: "typescript",
      core: "rust"
    };
  }
}
