import type { McpOpenAiToolBridge } from "../../../mcp/openAi/McpOpenAiToolBridge.js";
import type { McpToolService } from "../../../mcp/tools/core/McpToolService.js";

export class AgentMcpFeatureComponents {
  constructor(
    readonly openAiToolBridge?: McpOpenAiToolBridge,
    readonly toolService?: McpToolService
  ) {}
}
