import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import { GRAPH_NODE_NAMES } from "../../../graph/model/GraphNodeName.js";

export class AgentGraphHealthDescriptor {
  describe(): JsonObject {
    return {
      compiled: true,
      checkpoint: "typescript-runtime",
      nodes: [
        "validate_request",
        "load_memory",
        "load_rag",
        "load_web_fetch",
        "load_web_search",
        "load_mcp_tools",
        "load_workspace_tools",
        "load_web_tools",
        "load_rag_tools",
        "load_memory_tools",
        "generate",
        "finalize"
      ],
      workflow_nodes: [...GRAPH_NODE_NAMES],
      runtime: "typescript",
      core: "rust"
    };
  }
}
