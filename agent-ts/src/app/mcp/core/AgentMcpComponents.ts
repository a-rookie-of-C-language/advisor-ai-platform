import type { AgentConfig } from "../../../config/model/core/AgentConfig.js";
import type { McpOpenAiToolBridge } from "../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import type { McpToolService } from "../../../mcp/tools/core/service/McpToolService.js";
import { AgentMcpConfigFactory } from "../factory/AgentMcpConfigFactory.js";
import { AgentMcpFeatureComponentsFactory } from "../factory/AgentMcpFeatureComponentsFactory.js";

export class AgentMcpComponents {
  readonly openAiToolBridge?: McpOpenAiToolBridge;
  readonly toolService?: McpToolService;

  constructor(config: AgentConfig) {
    const mcpConfigs = new AgentMcpConfigFactory().create(config);
    const components = new AgentMcpFeatureComponentsFactory().create(mcpConfigs);
    this.openAiToolBridge = components.openAiToolBridge;
    this.toolService = components.toolService;
  }
}
