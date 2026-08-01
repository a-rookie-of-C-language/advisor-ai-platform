import type { JsonObject } from "./JsonTypes.js";
import { McpOpenAiToolCatalog } from "./McpOpenAiToolCatalog.js";
import type { McpToolService } from "./McpToolService.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { OpenAiToolResultFactory } from "./OpenAiToolResultFactory.js";

export class McpOpenAiToolBridge {
  private readonly catalog = new McpOpenAiToolCatalog();

  constructor(private readonly mcpToolService: McpToolService) {}

  async listTools(): Promise<OpenAIChatTool[]> {
    const descriptors = await this.mcpToolService.listTools();
    return this.catalog.listTools(descriptors);
  }

  async executeTool(openAiToolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const target = this.catalog.resolveTarget(openAiToolName);
    if (!target) {
      return OpenAiToolResultFactory.error(`未知 MCP 工具: ${openAiToolName}`);
    }

    const result = await this.mcpToolService.callTool(target.server, target.name, args);
    const text = result.content.map((item) => item.text).filter(Boolean).join("\n");
    return {
      output: text || JSON.stringify(result),
      success: !result.isError
    };
  }
}
