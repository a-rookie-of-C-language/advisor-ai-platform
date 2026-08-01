import type { AgentConfig } from "../config/AgentConfig.js";
import { McpConfigParser } from "../mcp/McpConfigParser.js";
import type { McpOpenAiToolBridge } from "../mcp/McpOpenAiToolBridge.js";
import { McpOpenAiToolBridge as McpOpenAiToolBridgeClass } from "../mcp/McpOpenAiToolBridge.js";
import type { McpToolService } from "../mcp/McpToolService.js";
import { McpToolService as McpToolServiceClass } from "../mcp/McpToolService.js";

export class AgentMcpComponents {
  readonly openAiToolBridge?: McpOpenAiToolBridge;
  readonly toolService?: McpToolService;

  constructor(config: AgentConfig) {
    const mcpConfigs = config.mcpToolsEnabled ? new McpConfigParser().parseServerConfigs(config.mcpServers) : [];
    this.toolService = mcpConfigs.length > 0 ? new McpToolServiceClass(mcpConfigs) : undefined;
    this.openAiToolBridge = this.toolService ? new McpOpenAiToolBridgeClass(this.toolService) : undefined;
  }
}
