import type { McpOpenAiToolBridge } from "../../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import type { OpenAIChatTool } from "../../../chat/model/OpenAIChatTool.js";

export class OpenAiMcpToolCatalogCollector {
  constructor(private readonly mcpOpenAiToolBridge?: McpOpenAiToolBridge) {}

  async listTools(): Promise<OpenAIChatTool[]> {
    try {
      return this.mcpOpenAiToolBridge ? await this.mcpOpenAiToolBridge.listTools() : [];
    } catch {
      return [];
    }
  }
}
