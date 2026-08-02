import type { AgentMcpComponents } from "./AgentMcpComponents.js";
import type { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import type { AgentRagComponents } from "./AgentRagComponents.js";
import type { AgentWebComponents } from "./AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "./AgentWorkspaceComponents.js";

export class AgentApplicationComponents {
  constructor(
    readonly memoryComponents: AgentMemoryComponents,
    readonly ragComponents: AgentRagComponents,
    readonly webComponents: AgentWebComponents,
    readonly workspaceComponents: AgentWorkspaceComponents,
    readonly mcpComponents: AgentMcpComponents
  ) {}
}
