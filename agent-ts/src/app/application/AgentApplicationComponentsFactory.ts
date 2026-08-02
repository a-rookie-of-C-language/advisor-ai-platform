import type { AgentConfig } from "../../config/AgentConfig.js";
import { AgentApplicationComponents } from "./AgentApplicationComponents.js";
import { AgentMcpComponents } from "../mcp/AgentMcpComponents.js";
import { AgentMemoryComponents } from "../memory/AgentMemoryComponents.js";
import { AgentRagComponents } from "../rag/AgentRagComponents.js";
import { AgentWebComponents } from "../web/AgentWebComponents.js";
import { AgentWorkspaceComponents } from "../workspace/AgentWorkspaceComponents.js";

export class AgentApplicationComponentsFactory {
  create(config: AgentConfig): AgentApplicationComponents {
    return new AgentApplicationComponents(
      new AgentMemoryComponents(config),
      new AgentRagComponents(config),
      new AgentWebComponents(config),
      new AgentWorkspaceComponents(config),
      new AgentMcpComponents(config)
    );
  }
}
