import type { McpOpenAiToolBridge } from "../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import type { McpToolService } from "../../../mcp/tools/core/service/McpToolService.js";

export class AgentMcpFeatureComponents {
  constructor(
    readonly openAiToolBridge?: McpOpenAiToolBridge,
    readonly toolService?: McpToolService
  ) {}
}
