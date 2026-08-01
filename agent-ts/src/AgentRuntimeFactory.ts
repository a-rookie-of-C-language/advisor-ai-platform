import type { AgentConfig } from "./AgentConfig.js";
import { AgentCoreClient } from "./AgentCoreClient.js";
import type { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import type { AgentMcpComponents } from "./AgentMcpComponents.js";
import type { AgentRagComponents } from "./AgentRagComponents.js";
import { AgentRuntime } from "./AgentRuntime.js";
import type { AgentWebComponents } from "./AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "./AgentWorkspaceComponents.js";
import { OpenAIChatClient } from "./OpenAIChatClient.js";
import { OpenAiToolRegistry } from "./OpenAiToolRegistry.js";

export class AgentRuntimeFactory {
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
    const openAiToolRegistry = new OpenAiToolRegistry(
      workspaceComponents.openAiToolBridge,
      webComponents.openAiToolBridge,
      ragComponents.openAiToolBridge,
      memoryComponents.openAiToolBridge,
      mcpComponents.openAiToolBridge
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
