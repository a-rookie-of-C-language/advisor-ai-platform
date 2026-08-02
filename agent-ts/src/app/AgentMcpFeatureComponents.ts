import type { McpOpenAiToolBridge } from "../mcp/McpOpenAiToolBridge.js";
import type { McpToolService } from "../mcp/McpToolService.js";

export class AgentMcpFeatureComponents {
  constructor(
    readonly openAiToolBridge?: McpOpenAiToolBridge,
    readonly toolService?: McpToolService
  ) {}
}
