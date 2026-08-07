import type { AgentConfig } from "../../../../config/model/AgentConfig.js";
import { AgentOpenAiToolRegistryFactory } from "../../../openAi/factory/registry/AgentOpenAiToolRegistryFactory.js";
import type { AgentMcpComponents } from "../../../mcp/core/AgentMcpComponents.js";
import type { AgentMemoryComponents } from "../../../memory/core/AgentMemoryComponents.js";
import type { AgentRagComponents } from "../../../rag/core/AgentRagComponents.js";
import type { AgentWebComponents } from "../../../web/core/AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "../../../workspace/core/AgentWorkspaceComponents.js";
import { AgentRuntimeDependencies } from "../../model/AgentRuntimeDependencies.js";
import { AgentRuntimeClientFactory } from "../client/AgentRuntimeClientFactory.js";

export class AgentRuntimeDependenciesFactory {
  private readonly clientFactory = new AgentRuntimeClientFactory();
  private readonly openAiToolRegistryFactory = new AgentOpenAiToolRegistryFactory();

  create(
    config: AgentConfig,
    memoryComponents: AgentMemoryComponents,
    ragComponents: AgentRagComponents,
    webComponents: AgentWebComponents,
    workspaceComponents: AgentWorkspaceComponents,
    mcpComponents: AgentMcpComponents
  ): AgentRuntimeDependencies {
    return new AgentRuntimeDependencies(
      this.clientFactory.createCoreClient(config),
      this.clientFactory.createOpenAiClient(config),
      this.openAiToolRegistryFactory.create(memoryComponents, ragComponents, webComponents, workspaceComponents, mcpComponents)
    );
  }
}
