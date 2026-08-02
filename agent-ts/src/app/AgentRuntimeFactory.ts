import type { AgentConfig } from "../config/AgentConfig.js";
import { AgentCoreClient } from "../core/AgentCoreClient.js";
import type { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import type { AgentMcpComponents } from "./AgentMcpComponents.js";
import type { AgentRagComponents } from "./AgentRagComponents.js";
import { AgentOpenAiToolRegistryFactory } from "./AgentOpenAiToolRegistryFactory.js";
import { AgentRuntime } from "./AgentRuntime.js";
import type { AgentWebComponents } from "./AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "./AgentWorkspaceComponents.js";
import { OpenAIChatClient } from "../openai/OpenAIChatClient.js";

export class AgentRuntimeFactory {
  private readonly openAiToolRegistryFactory = new AgentOpenAiToolRegistryFactory();

  create(
    config: AgentConfig,
    memoryComponents: AgentMemoryComponents,
    ragComponents: AgentRagComponents,
    webComponents: AgentWebComponents,
    workspaceComponents: AgentWorkspaceComponents,
    mcpComponents: AgentMcpComponents
  ): AgentRuntime {
    const core = new AgentCoreClient(config.rustCorePath);
    const openAiClient = new OpenAIChatClient(config);
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
