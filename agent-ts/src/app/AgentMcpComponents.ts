import type { AgentConfig } from "../config/AgentConfig.js";
import type { McpOpenAiToolBridge } from "../mcp/McpOpenAiToolBridge.js";
import { McpOpenAiToolBridge as McpOpenAiToolBridgeClass } from "../mcp/McpOpenAiToolBridge.js";
import type { McpToolService } from "../mcp/McpToolService.js";
import { McpToolService as McpToolServiceClass } from "../mcp/McpToolService.js";
import { AgentMcpConfigFactory } from "./AgentMcpConfigFactory.js";

export class AgentMcpComponents {
  readonly openAiToolBridge?: McpOpenAiToolBridge;
  readonly toolService?: McpToolService;

  constructor(config: AgentConfig) {
    const mcpConfigs = new AgentMcpConfigFactory().create(config);
    this.toolService = mcpConfigs.length > 0 ? new McpToolServiceClass(mcpConfigs) : undefined;
    this.openAiToolBridge = this.toolService ? new McpOpenAiToolBridgeClass(this.toolService) : undefined;
  }
}
