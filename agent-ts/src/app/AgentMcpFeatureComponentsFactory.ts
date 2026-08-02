import { McpOpenAiToolBridge as McpOpenAiToolBridgeClass } from "../mcp/openAi/McpOpenAiToolBridge.js";
import type { McpServerConfig } from "../mcp/McpServerConfig.js";
import { McpToolService as McpToolServiceClass } from "../mcp/McpToolService.js";
import { AgentMcpFeatureComponents } from "./AgentMcpFeatureComponents.js";

export class AgentMcpFeatureComponentsFactory {
  create(mcpConfigs: McpServerConfig[]): AgentMcpFeatureComponents {
    const toolService = mcpConfigs.length > 0 ? new McpToolServiceClass(mcpConfigs) : undefined;
    return new AgentMcpFeatureComponents(
      toolService ? new McpOpenAiToolBridgeClass(toolService) : undefined,
      toolService
    );
  }
}
