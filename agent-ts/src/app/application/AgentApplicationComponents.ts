import type { AgentMcpComponents } from "../mcp/AgentMcpComponents.js";
import type { AgentMemoryComponents } from "../memory/core/AgentMemoryComponents.js";
import type { AgentRagComponents } from "../rag/core/AgentRagComponents.js";
import type { AgentWebComponents } from "../web/core/AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "../workspace/AgentWorkspaceComponents.js";

export class AgentApplicationComponents {
  constructor(
    readonly memoryComponents: AgentMemoryComponents,
    readonly ragComponents: AgentRagComponents,
    readonly webComponents: AgentWebComponents,
    readonly workspaceComponents: AgentWorkspaceComponents,
    readonly mcpComponents: AgentMcpComponents
  ) {}
}
