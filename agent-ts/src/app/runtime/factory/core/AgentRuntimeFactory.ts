import type { AgentConfig } from "../../../../config/model/AgentConfig.js";
import type { AgentMcpComponents } from "../../../mcp/core/AgentMcpComponents.js";
import type { AgentMemoryComponents } from "../../../memory/core/AgentMemoryComponents.js";
import type { AgentRagComponents } from "../../../rag/core/AgentRagComponents.js";
import type { AgentWebComponents } from "../../../web/core/AgentWebComponents.js";
import type { AgentWorkspaceComponents } from "../../../workspace/core/AgentWorkspaceComponents.js";
import { AgentRuntime } from "../../core/AgentRuntime.js";
import { AgentRuntimeDependenciesFactory } from "../dependencies/AgentRuntimeDependenciesFactory.js";

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
