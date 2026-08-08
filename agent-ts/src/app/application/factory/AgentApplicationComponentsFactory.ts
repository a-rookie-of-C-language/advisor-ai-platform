import type { AgentConfig } from "../../../config/model/core/AgentConfig.js";
import { AgentMcpComponents } from "../../mcp/core/AgentMcpComponents.js";
import { AgentMemoryComponents } from "../../memory/core/AgentMemoryComponents.js";
import { AgentRagComponents } from "../../rag/core/AgentRagComponents.js";
import { AgentWebComponents } from "../../web/core/AgentWebComponents.js";
import { AgentWorkspaceComponents } from "../../workspace/core/AgentWorkspaceComponents.js";
import { AgentApplicationComponents } from "../model/AgentApplicationComponents.js";

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
