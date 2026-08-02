import type { AgentConfig } from "../config/AgentConfig.js";
import type { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import type { AgentMcpComponents } from "./AgentMcpComponents.js";
import type { AgentRagComponents } from "./AgentRagComponents.js";
import { AgentOpenAiToolRegistryFactory } from "./AgentOpenAiToolRegistryFactory.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { AgentRuntimeClientFactory } from "./AgentRuntimeClientFactory.js";
import type { AgentWebComponents } from "./AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "./AgentWorkspaceComponents.js";

export class AgentRuntimeFactory {
  private readonly clientFactory = new AgentRuntimeClientFactory();
  private readonly openAiToolRegistryFactory = new AgentOpenAiToolRegistryFactory();

  create(
    config: AgentConfig,
    memoryComponents: AgentMemoryComponents,
    ragComponents: AgentRagComponents,
    webComponents: AgentWebComponents,
    workspaceComponents: AgentWorkspaceComponents,
    mcpComponents: AgentMcpComponents
  ): AgentRuntime {
    const core = this.clientFactory.createCoreClient(config);
    const openAiClient = this.clientFactory.createOpenAiClient(config);
    const openAiToolRegistry = this.openAiToolRegistryFactory.create(
      memoryComponents,
      ragComponents,
      webComponents,
      workspaceComponents,
      mcpComponents
    );
    return new AgentRuntime(
      config,
      core,
      openAiClient,
      memoryComponents.contextBuilder,
      memoryComponents.taskSubmitter,
      ragComponents.contextBuilder,
      webComponents.fetchContextBuilder,
      webComponents.searchContextBuilder,
      openAiToolRegistry
    );
  }
}
