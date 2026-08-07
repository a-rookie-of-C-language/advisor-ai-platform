import type { McpServerConfig } from "../../../mcp/config/model/McpServerConfig.js";
import { McpOpenAiToolBridge as McpOpenAiToolBridgeClass } from "../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import { McpToolService as McpToolServiceClass } from "../../../mcp/tools/core/McpToolService.js";
import { AgentMcpFeatureComponents } from "../model/AgentMcpFeatureComponents.js";

export class AgentMcpFeatureComponentsFactory {
  create(mcpConfigs: McpServerConfig[]): AgentMcpFeatureComponents {
    const toolService = mcpConfigs.length > 0 ? new McpToolServiceClass(mcpConfigs) : undefined;
    return new AgentMcpFeatureComponents(
      toolService ? new McpOpenAiToolBridgeClass(toolService) : undefined,
      toolService
    );
  }
}
