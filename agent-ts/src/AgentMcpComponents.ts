import type { AgentConfig } from "./config/AgentConfig.js";
import { McpConfigParser } from "./McpConfigParser.js";
import type { McpOpenAiToolBridge } from "./McpOpenAiToolBridge.js";
import { McpOpenAiToolBridge as McpOpenAiToolBridgeClass } from "./McpOpenAiToolBridge.js";
import type { McpToolService } from "./McpToolService.js";
import { McpToolService as McpToolServiceClass } from "./McpToolService.js";

export class AgentMcpComponents {
  readonly openAiToolBridge?: McpOpenAiToolBridge;
  readonly toolService?: McpToolService;

  constructor(config: AgentConfig) {
    const mcpConfigs = config.mcpToolsEnabled ? new McpConfigParser().parseServerConfigs(config.mcpServers) : [];
    this.toolService = mcpConfigs.length > 0 ? new McpToolServiceClass(mcpConfigs) : undefined;
    this.openAiToolBridge = this.toolService ? new McpOpenAiToolBridgeClass(this.toolService) : undefined;
  }
}
