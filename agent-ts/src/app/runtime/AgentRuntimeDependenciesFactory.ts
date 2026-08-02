import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { AgentMcpComponents } from "../mcp/AgentMcpComponents.js";
import type { AgentMemoryComponents } from "../memory/core/AgentMemoryComponents.js";
import type { AgentRagComponents } from "../rag/core/AgentRagComponents.js";
import { AgentOpenAiToolRegistryFactory } from "../openAi/factory/AgentOpenAiToolRegistryFactory.js";
import { AgentRuntimeClientFactory } from "./AgentRuntimeClientFactory.js";
import { AgentRuntimeDependencies } from "./AgentRuntimeDependencies.js";
import type { AgentWebComponents } from "../web/core/AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "../workspace/AgentWorkspaceComponents.js";

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
