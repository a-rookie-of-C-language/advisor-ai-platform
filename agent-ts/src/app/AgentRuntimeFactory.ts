import type { AgentConfig } from "../config/AgentConfig.js";
import type { AgentMemoryComponents } from "./memory/AgentMemoryComponents.js";
import type { AgentMcpComponents } from "./mcp/AgentMcpComponents.js";
import type { AgentRagComponents } from "./AgentRagComponents.js";
import { AgentRuntime } from "./AgentRuntime.js";
import { AgentRuntimeDependenciesFactory } from "./AgentRuntimeDependenciesFactory.js";
import type { AgentWebComponents } from "./AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "./AgentWorkspaceComponents.js";

export class AgentRuntimeFactory {
  private readonly dependenciesFactory = new AgentRuntimeDependenciesFactory();

  create(
    config: AgentConfig,
    memoryComponents: AgentMemoryComponents,
    ragComponents: AgentRagComponents,
    webComponents: AgentWebComponents,
    workspaceComponents: AgentWorkspaceComponents,
    mcpComponents: AgentMcpComponents
  ): AgentRuntime {
    const dependencies = this.dependenciesFactory.create(
      config,
      memoryComponents,
      ragComponents,
      webComponents,
      workspaceComponents,
      mcpComponents
    );
    return new AgentRuntime(
      config,
      dependencies.core,
      dependencies.openAiClient,
      memoryComponents.contextBuilder,
      memoryComponents.taskSubmitter,
      ragComponents.contextBuilder,
      webComponents.fetchContextBuilder,
      webComponents.searchContextBuilder,
      dependencies.openAiToolRegistry
    );
  }
}
