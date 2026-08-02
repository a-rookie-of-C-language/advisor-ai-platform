import type { AgentConfig } from "../config/AgentConfig.js";
import type { McpOpenAiToolBridge } from "../mcp/openAi/McpOpenAiToolBridge.js";
import type { McpToolService } from "../mcp/tools/McpToolService.js";
import { AgentMcpConfigFactory } from "./AgentMcpConfigFactory.js";
import { AgentMcpFeatureComponentsFactory } from "./AgentMcpFeatureComponentsFactory.js";

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
